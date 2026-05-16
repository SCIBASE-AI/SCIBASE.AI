const DEFAULT_REFERENCE_DATE = "2026-05-16T00:00:00.000Z";

const RECOMMENDABLE_TYPES = new Set(["dataset", "notebook", "protocol"]);
const TARGET_QUERY_TYPES = new Set(["project", "paper"]);
const ARTIFACT_TYPES = new Set(["dataset", "notebook", "protocol"]);

export function buildArtifactReuseLineage(input) {
  const referenceDate = new Date(input.referenceDate || DEFAULT_REFERENCE_DATE);
  const nodes = indexEntities(input.entities || []);
  const edges = (input.reuseEvidence || []).map((item) => buildEdge(item, nodes, referenceDate));
  const adjacency = buildAdjacency(edges);
  const paths = buildLineagePaths(nodes, adjacency);
  const graphQueries = buildGraphQueries(nodes, edges, paths);
  const recommendations = buildRecommendations(input.recommendationRequests || [], nodes, edges, paths);
  const curatorActions = buildCuratorActions(nodes, edges, paths);
  const dashboard = buildDashboard(nodes, edges, paths, recommendations, curatorActions);

  return {
    generatedAt: input.generatedAt || new Date().toISOString(),
    referenceDate: referenceDate.toISOString(),
    nodes: Array.from(nodes.values()),
    edges,
    paths,
    graphQueries,
    recommendations,
    curatorActions,
    dashboard
  };
}

export function validateLineageInput(input) {
  const errors = [];
  if (!input || typeof input !== "object") {
    return ["Input must be an object."];
  }

  const ids = new Set();
  for (const entity of input.entities || []) {
    if (!entity.id) errors.push("Every entity needs an id.");
    if (!entity.type) errors.push(`Entity ${entity.id || "<missing>"} needs a type.`);
    if (ids.has(entity.id)) errors.push(`Duplicate entity id: ${entity.id}`);
    ids.add(entity.id);
  }

  for (const edge of input.reuseEvidence || []) {
    if (!ids.has(edge.sourceId)) errors.push(`Missing source entity: ${edge.sourceId}`);
    if (!ids.has(edge.targetId)) errors.push(`Missing target entity: ${edge.targetId}`);
    if (!edge.relation) errors.push(`Missing relation for edge ${edge.sourceId} -> ${edge.targetId}`);
  }

  return errors;
}

function indexEntities(entities) {
  const nodes = new Map();
  for (const entity of entities) {
    const normalized = {
      id: entity.id,
      type: entity.type,
      title: entity.title,
      domain: entity.domain || "unknown",
      keywords: normalizeKeywords(entity.keywords),
      metadata: {
        doi: entity.doi || null,
        license: entity.license || null,
        owner: entity.owner || null,
        language: entity.language || null
      }
    };
    nodes.set(normalized.id, normalized);
  }
  return nodes;
}

function buildEdge(item, nodes, referenceDate) {
  const source = requireNode(nodes, item.sourceId);
  const target = requireNode(nodes, item.targetId);
  const evidence = item.evidence || {};
  const observedAt = new Date(item.observedAt || referenceDate);
  const ageDays = Math.max(0, Math.round((referenceDate - observedAt) / 86400000));
  const freshnessDays = Number.isFinite(evidence.freshnessDays) ? evidence.freshnessDays : ageDays;
  const scoreBreakdown = scoreEvidence(evidence, freshnessDays);
  const confidence = round(scoreBreakdown.total);

  return {
    id: `${source.id}->${target.id}:${item.relation}`,
    sourceId: source.id,
    targetId: target.id,
    sourceType: source.type,
    targetType: target.type,
    relation: item.relation,
    observedAt: observedAt.toISOString(),
    confidence,
    strength: classifyConfidence(confidence),
    evidence: {
      citation: Boolean(evidence.citation),
      checksumMatch: evidence.checksumMatch === undefined ? null : Boolean(evidence.checksumMatch),
      executionVerified: evidence.executionVerified === undefined ? null : Boolean(evidence.executionVerified),
      provenanceRecord: Boolean(evidence.provenanceRecord),
      licenseReviewed: evidence.licenseReviewed === undefined ? null : Boolean(evidence.licenseReviewed),
      metadataOverlap: round(Number(evidence.metadataOverlap || 0)),
      freshnessDays
    },
    scoreBreakdown,
    explanation: explainEdge(source, target, item.relation, confidence, scoreBreakdown)
  };
}

function scoreEvidence(evidence, freshnessDays) {
  const citation = evidence.citation ? 0.18 : 0;
  const checksum = evidence.checksumMatch === true ? 0.2 : evidence.checksumMatch === false ? -0.12 : 0;
  const execution = evidence.executionVerified === true ? 0.18 : evidence.executionVerified === false ? -0.08 : 0;
  const provenance = evidence.provenanceRecord ? 0.2 : 0;
  const license = evidence.licenseReviewed ? 0.08 : 0;
  const metadata = clamp(Number(evidence.metadataOverlap || 0), 0, 1) * 0.18;
  const freshness = freshnessScore(freshnessDays) * 0.14;
  const total = clamp(0.18 + citation + checksum + execution + provenance + license + metadata + freshness, 0, 1);

  return {
    citation: round(citation),
    checksum: round(checksum),
    execution: round(execution),
    provenance: round(provenance),
    license: round(license),
    metadata: round(metadata),
    freshness: round(freshness),
    total: round(total)
  };
}

function freshnessScore(days) {
  if (days <= 30) return 1;
  if (days >= 365) return 0;
  return 1 - (days - 30) / 335;
}

function buildAdjacency(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.sourceId)) adjacency.set(edge.sourceId, []);
    adjacency.get(edge.sourceId).push(edge);
  }
  return adjacency;
}

function buildLineagePaths(nodes, adjacency) {
  const paths = [];

  for (const node of nodes.values()) {
    if (!ARTIFACT_TYPES.has(node.type)) continue;
    const queue = [{ nodeId: node.id, edges: [] }];
    const seen = new Set([node.id]);

    while (queue.length > 0) {
      const current = queue.shift();
      for (const edge of adjacency.get(current.nodeId) || []) {
        if (seen.has(edge.targetId)) continue;
        const nextEdges = [...current.edges, edge];
        const target = nodes.get(edge.targetId);
        const minConfidence = Math.min(...nextEdges.map((pathEdge) => pathEdge.confidence));

        if (TARGET_QUERY_TYPES.has(target.type)) {
          paths.push({
            id: `${node.id}->${target.id}`,
            startId: node.id,
            startType: node.type,
            targetId: target.id,
            targetType: target.type,
            relationTrail: nextEdges.map((pathEdge) => pathEdge.relation),
            edgeIds: nextEdges.map((pathEdge) => pathEdge.id),
            confidence: round(minConfidence),
            strength: classifyConfidence(minConfidence),
            explanation: explainPath(node, target, nextEdges, minConfidence)
          });
        }

        if (nextEdges.length < 3) {
          seen.add(edge.targetId);
          queue.push({ nodeId: edge.targetId, edges: nextEdges });
        }
      }
    }
  }

  return paths.sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));
}

function buildGraphQueries(nodes, edges, paths) {
  const projectsByDataset = groupPaths(paths, nodes, "dataset", "project");
  const papersByDataset = groupPaths(paths, nodes, "dataset", "paper");
  const experimentsByNotebook = groupPaths(paths, nodes, "notebook", "project");
  const projectsByProtocol = groupPaths(paths, nodes, "protocol", "project");
  const lowTrustEdges = edges
    .filter((edge) => edge.confidence < 0.55)
    .map((edge) => ({
      edgeId: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      confidence: edge.confidence,
      reason: edge.explanation
    }));

  return {
    projectsByDataset,
    papersByDataset,
    experimentsByNotebook,
    projectsByProtocol,
    lowTrustEdges
  };
}

function groupPaths(paths, nodes, startType, targetType) {
  const grouped = {};
  for (const path of paths) {
    if (path.startType !== startType || path.targetType !== targetType) continue;
    if (!grouped[path.startId]) grouped[path.startId] = [];
    grouped[path.startId].push({
      id: path.targetId,
      title: nodes.get(path.targetId).title,
      confidence: path.confidence,
      relationTrail: path.relationTrail,
      explanation: path.explanation
    });
  }
  return grouped;
}

function buildRecommendations(requests, nodes, edges, paths) {
  const incomingByTarget = new Map();
  for (const path of paths) {
    if (!incomingByTarget.has(path.targetId)) incomingByTarget.set(path.targetId, []);
    incomingByTarget.get(path.targetId).push(path);
  }

  return requests.map((request) => {
    const project = nodes.get(request.projectId);
    const interests = normalizeKeywords(request.interests || []);
    const projectKeywords = new Set([...(project?.keywords || []), ...interests]);
    const candidatePaths = incomingByTarget.get(request.projectId) || [];
    const recommendations = candidatePaths
      .filter((path) => RECOMMENDABLE_TYPES.has(path.startType))
      .map((path) => {
        const artifact = nodes.get(path.startId);
        const keywordOverlap = overlapScore(projectKeywords, artifact.keywords);
        const edge = edges.find((candidateEdge) => candidateEdge.id === path.edgeIds[0]);
        const recommendationScore = round(path.confidence * 0.72 + keywordOverlap * 0.28);
        return {
          artifactId: artifact.id,
          artifactTitle: artifact.title,
          artifactType: artifact.type,
          recommendationScore,
          confidence: path.confidence,
          keywordOverlap: round(keywordOverlap),
          evidencePath: path.edgeIds,
          explanation: [
            path.explanation,
            `Keyword overlap ${round(keywordOverlap)} with project/interests.`,
            edge?.evidence.checksumMatch === false ? "Checksum mismatch needs curator review before strong reuse." : null
          ].filter(Boolean)
        };
      })
      .sort((a, b) => b.recommendationScore - a.recommendationScore || a.artifactId.localeCompare(b.artifactId));

    return {
      requestId: request.id,
      userId: request.userId,
      projectId: request.projectId,
      recommendations,
      suppressed: buildSuppressedRecommendations(candidatePaths, nodes, edges)
    };
  });
}

function buildSuppressedRecommendations(candidatePaths, nodes, edges) {
  return candidatePaths
    .filter((path) => path.confidence < 0.55)
    .map((path) => {
      const edge = edges.find((candidateEdge) => candidateEdge.id === path.edgeIds[0]);
      return {
        artifactId: path.startId,
        artifactTitle: nodes.get(path.startId)?.title || path.startId,
        confidence: path.confidence,
        reason: edge?.evidence.checksumMatch === false
          ? "Lineage is suppressed until checksum mismatch is resolved."
          : "Lineage evidence is too weak for automatic recommendation."
      };
    });
}

function buildCuratorActions(nodes, edges, paths) {
  const actions = [];

  for (const edge of edges) {
    if (edge.confidence < 0.55) {
      actions.push({
        id: `review:${edge.id}`,
        priority: edge.confidence < 0.4 ? "high" : "medium",
        entityIds: [edge.sourceId, edge.targetId],
        action: "review_lineage_evidence",
        reason: edge.explanation
      });
    }

    if (edge.evidence.checksumMatch === false) {
      actions.push({
        id: `checksum:${edge.id}`,
        priority: "high",
        entityIds: [edge.sourceId, edge.targetId],
        action: "resolve_checksum_mismatch",
        reason: `${nodes.get(edge.sourceId).title} is linked to ${nodes.get(edge.targetId).title}, but checksum evidence does not match.`
      });
    }

    if (edge.evidence.freshnessDays > 180) {
      actions.push({
        id: `refresh:${edge.id}`,
        priority: "medium",
        entityIds: [edge.sourceId, edge.targetId],
        action: "refresh_stale_lineage",
        reason: `Evidence is ${edge.evidence.freshnessDays} days old and should be refreshed before strong recommendations.`
      });
    }

    if (ARTIFACT_TYPES.has(edge.sourceType) && edge.evidence.licenseReviewed === false) {
      actions.push({
        id: `license:${edge.id}`,
        priority: "medium",
        entityIds: [edge.sourceId],
        action: "review_reuse_license",
        reason: `License review is missing for ${nodes.get(edge.sourceId).title}.`
      });
    }
  }

  const weakPaths = paths.filter((path) => path.confidence < 0.55);
  for (const path of weakPaths) {
    actions.push({
      id: `path:${path.id}`,
      priority: "low",
      entityIds: [path.startId, path.targetId],
      action: "hide_weak_navigation_path",
      reason: `Hide or demote ${path.id} from navigation until lineage confidence improves.`
    });
  }

  return dedupeById(actions).sort(sortActions);
}

function buildDashboard(nodes, edges, paths, recommendations, actions) {
  const highConfidenceEdges = edges.filter((edge) => edge.confidence >= 0.75).length;
  const weakEdges = edges.filter((edge) => edge.confidence < 0.55).length;
  const recommendationCount = recommendations.reduce((sum, request) => sum + request.recommendations.length, 0);
  const nodeTypes = {};

  for (const node of nodes.values()) {
    nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
  }

  return {
    nodeCount: nodes.size,
    edgeCount: edges.length,
    pathCount: paths.length,
    nodeTypes,
    highConfidenceEdges,
    weakEdges,
    recommendationCount,
    curatorActionCount: actions.length,
    readiness: weakEdges === 0 ? "ready" : highConfidenceEdges > weakEdges ? "reviewable" : "needs-curation"
  };
}

function explainEdge(source, target, relation, confidence, breakdown) {
  const signals = [];
  if (breakdown.checksum > 0) signals.push("checksum match");
  if (breakdown.execution > 0) signals.push("verified execution");
  if (breakdown.provenance > 0) signals.push("provenance record");
  if (breakdown.citation > 0) signals.push("citation evidence");
  if (breakdown.checksum < 0) signals.push("checksum mismatch");
  if (breakdown.execution < 0) signals.push("unverified execution");

  const signalText = signals.length > 0 ? signals.join(", ") : "limited evidence";
  return `${source.title} ${relation} ${target.title} with ${classifyConfidence(confidence)} confidence (${round(confidence)}): ${signalText}.`;
}

function explainPath(start, target, edges, confidence) {
  const trail = edges.map((edge) => edge.relation).join(" -> ");
  return `${start.title} reaches ${target.title} through ${trail}; weakest edge confidence is ${round(confidence)}.`;
}

function requireNode(nodes, id) {
  const node = nodes.get(id);
  if (!node) throw new Error(`Unknown node: ${id}`);
  return node;
}

function normalizeKeywords(keywords = []) {
  return Array.from(new Set(keywords.map((keyword) => String(keyword).trim().toLowerCase()).filter(Boolean)));
}

function overlapScore(leftKeywords, rightKeywords) {
  const left = new Set(leftKeywords);
  const right = new Set(rightKeywords);
  if (left.size === 0 || right.size === 0) return 0;
  let overlap = 0;
  for (const keyword of right) {
    if (left.has(keyword)) overlap += 1;
  }
  return overlap / Math.max(left.size, right.size);
}

function classifyConfidence(score) {
  if (score >= 0.75) return "strong";
  if (score >= 0.55) return "reviewable";
  return "weak";
}

function dedupeById(items) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function sortActions(left, right) {
  const priority = { high: 0, medium: 1, low: 2 };
  return priority[left.priority] - priority[right.priority] || left.id.localeCompare(right.id);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
