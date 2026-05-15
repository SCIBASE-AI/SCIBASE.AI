"use strict";

const ENTITY_TYPES = ["concept", "method", "dataset", "tool", "author", "institution", "domain"];

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function entityKey(type, label) {
  return `${type}:${normalizeId(label)}`;
}

function createEmptyGraph() {
  return {
    nodes: new Map(),
    edges: new Map(),
    projects: new Map(),
    citations: new Map()
  };
}

function addNode(graph, type, label, metadata = {}) {
  if (!ENTITY_TYPES.includes(type)) {
    throw new Error(`Unsupported entity type: ${type}`);
  }

  const key = entityKey(type, label);
  const existing = graph.nodes.get(key);
  if (existing) {
    existing.count += 1;
    existing.projectIds = unique([...existing.projectIds, ...(metadata.projectIds || [])]);
    existing.citationDois = unique([...existing.citationDois, ...(metadata.citationDois || [])]);
    return existing;
  }

  const node = {
    id: key,
    type,
    label: canonicalText(label),
    count: 1,
    projectIds: metadata.projectIds || [],
    citationDois: metadata.citationDois || [],
    metadata: { ...metadata }
  };
  graph.nodes.set(key, node);
  return node;
}

function addEdge(graph, sourceId, targetId, relation, projectId, weight = 1) {
  const [left, right] = [sourceId, targetId].sort();
  const key = `${left}|${relation}|${right}`;
  const existing = graph.edges.get(key);
  if (existing) {
    existing.weight += weight;
    existing.projectIds = unique([...existing.projectIds, projectId]);
    return existing;
  }

  const edge = {
    id: key,
    sourceId: left,
    targetId: right,
    relation,
    weight,
    projectIds: [projectId]
  };
  graph.edges.set(key, edge);
  return edge;
}

function buildKnowledgeGraph(projects) {
  if (!Array.isArray(projects)) {
    throw new TypeError("projects must be an array");
  }

  const graph = createEmptyGraph();
  for (const project of projects) {
    validateProject(project);
    graph.projects.set(project.id, {
      ...project,
      title: canonicalText(project.title),
      concepts: unique(project.concepts.map(canonicalText)),
      methods: unique(project.methods.map(canonicalText)),
      datasets: unique(project.datasets.map(canonicalText)),
      tools: unique((project.tools || []).map(canonicalText)),
      citationDois: (project.citations || []).map((citation) => canonicalText(citation.doi).toLowerCase())
    });

    const projectEntityIds = [];
    const citationDois = (project.citations || []).map((citation) => {
      const doi = canonicalText(citation.doi).toLowerCase();
      graph.citations.set(doi, {
        doi,
        title: canonicalText(citation.title),
        projectIds: unique([...(graph.citations.get(doi)?.projectIds || []), project.id])
      });
      return doi;
    });

    for (const concept of project.concepts) {
      projectEntityIds.push(addNode(graph, "concept", concept, { projectIds: [project.id], citationDois }).id);
    }
    for (const method of project.methods) {
      projectEntityIds.push(addNode(graph, "method", method, { projectIds: [project.id], citationDois }).id);
    }
    for (const dataset of project.datasets) {
      projectEntityIds.push(addNode(graph, "dataset", dataset, { projectIds: [project.id], citationDois }).id);
    }
    for (const tool of project.tools || []) {
      projectEntityIds.push(addNode(graph, "tool", tool, { projectIds: [project.id], citationDois }).id);
    }
    for (const author of project.authors || []) {
      const authorNode = addNode(graph, "author", author.name, {
        projectIds: [project.id],
        institution: canonicalText(author.institution)
      });
      const institutionNode = addNode(graph, "institution", author.institution, { projectIds: [project.id] });
      addEdge(graph, authorNode.id, institutionNode.id, "affiliated-with", project.id, 1);
      projectEntityIds.push(authorNode.id, institutionNode.id);
    }
    const domainNode = addNode(graph, "domain", project.domain, { projectIds: [project.id] });
    projectEntityIds.push(domainNode.id);

    for (const pair of combinations(unique(projectEntityIds), 2)) {
      addEdge(graph, pair[0], pair[1], "co-occurs-in-project", project.id, 1);
    }
  }

  return freezeGraph(graph);
}

function freezeGraph(graph) {
  return {
    nodes: [...graph.nodes.values()].sort(sortByLabel),
    edges: [...graph.edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
    projects: [...graph.projects.values()].sort((a, b) => a.id.localeCompare(b.id)),
    citations: [...graph.citations.values()].sort((a, b) => a.doi.localeCompare(b.doi))
  };
}

function findKnowledgeGaps(graph, options = {}) {
  const minEvidence = options.minEvidence ?? 2;
  const limit = options.limit ?? 8;
  const concepts = graph.nodes.filter((node) => node.type === "concept");
  const methods = graph.nodes.filter((node) => node.type === "method");
  const datasets = graph.nodes.filter((node) => node.type === "dataset");
  const candidates = [];

  for (const concept of concepts) {
    for (const method of methods) {
      for (const dataset of datasets) {
        const directProjects = intersection(concept.projectIds, method.projectIds, dataset.projectIds);
        const evidence = scoreGapEvidence(graph, concept, method, dataset);
        if (directProjects.length > 0 || evidence.total < minEvidence) {
          continue;
        }

        const sparsity = 1 / (1 + directProjects.length);
        const recency = evidence.recentProjectCount / Math.max(1, evidence.supportingProjectIds.length);
        const reproducibility = evidence.averageReproducibility;
        const score = round((evidence.total * 1.6 + recency * 1.4 + reproducibility + sparsity) / 5);
        candidates.push({
          id: `gap:${normalizeId(concept.label)}:${normalizeId(method.label)}:${normalizeId(dataset.label)}`,
          concept: pickNode(concept),
          method: pickNode(method),
          dataset: pickNode(dataset),
          score,
          evidenceScore: evidence.total,
          averageReproducibility: round(evidence.averageReproducibility),
          supportingProjectIds: evidence.supportingProjectIds,
          sharedCitationDois: evidence.sharedCitationDois,
          explanation: evidence.explanation,
          suggestedAction: buildSuggestedAction(concept, method, dataset, evidence)
        });
      }
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || b.evidenceScore - a.evidenceScore || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function scoreGapEvidence(graph, concept, method, dataset) {
  const conceptMethod = pairEvidence(graph, concept, method);
  const conceptDataset = pairEvidence(graph, concept, dataset);
  const methodDataset = pairEvidence(graph, method, dataset);
  const supportingProjectIds = unique([
    ...conceptMethod.projectIds,
    ...conceptDataset.projectIds,
    ...methodDataset.projectIds
  ]);
  const sharedCitationDois = unique([
    ...shared(concept.citationDois, method.citationDois),
    ...shared(concept.citationDois, dataset.citationDois),
    ...shared(method.citationDois, dataset.citationDois)
  ]);
  const projects = supportingProjectIds.map((id) => graph.projects.find((project) => project.id === id)).filter(Boolean);
  const recentProjectCount = projects.filter((project) => project.year >= 2025).length;
  const averageReproducibility = average(projects.map((project) => project.reproducibilityScore || 0));
  const total = conceptMethod.weight + conceptDataset.weight + methodDataset.weight + sharedCitationDois.length;

  return {
    total,
    supportingProjectIds,
    sharedCitationDois,
    recentProjectCount,
    averageReproducibility,
    explanation: [
      explainPair(concept, method, conceptMethod),
      explainPair(concept, dataset, conceptDataset),
      explainPair(method, dataset, methodDataset),
      sharedCitationDois.length
        ? `${sharedCitationDois.length} shared citation thread(s): ${sharedCitationDois.slice(0, 3).join(", ")}`
        : "No shared citation thread yet; candidate needs targeted literature validation."
    ]
  };
}

function pairEvidence(graph, left, right) {
  const direct = graph.edges.find((edge) => {
    const ids = [edge.sourceId, edge.targetId];
    return ids.includes(left.id) && ids.includes(right.id) && edge.relation === "co-occurs-in-project";
  });
  return direct ? { weight: direct.weight, projectIds: direct.projectIds } : { weight: 0, projectIds: [] };
}

function explainPair(left, right, evidence) {
  if (!evidence.weight) {
    return `${left.label} and ${right.label} are not directly linked yet.`;
  }
  return `${left.label} links to ${right.label} through ${evidence.weight} project(s): ${evidence.projectIds.join(", ")}.`;
}

function buildRecommendationDigest(graph, userProfile, options = {}) {
  const interests = new Set((userProfile?.interests || []).map(normalizeId));
  const limit = options.limit ?? 5;
  const gaps = findKnowledgeGaps(graph, { ...options, limit: Math.max(limit * 2, 8) });
  const ranked = gaps.map((gap) => {
    const interestBoost = [gap.concept.label, gap.method.label, gap.dataset.label]
      .map(normalizeId)
      .filter((label) => interests.has(label)).length;
    return {
      ...gap,
      personalizedScore: round(gap.score + interestBoost * 0.22),
      matchedInterests: [gap.concept.label, gap.method.label, gap.dataset.label].filter((label) =>
        interests.has(normalizeId(label))
      )
    };
  });

  return ranked
    .sort((a, b) => b.personalizedScore - a.personalizedScore || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((gap) => ({
      id: gap.id,
      title: `${gap.concept.label} + ${gap.method.label} + ${gap.dataset.label}`,
      personalizedScore: gap.personalizedScore,
      matchedInterests: gap.matchedInterests,
      evidence: gap.explanation,
      action: gap.suggestedAction
    }));
}

function buildEntityPage(graph, entityId) {
  const node = graph.nodes.find((candidate) => candidate.id === entityId);
  if (!node) {
    throw new Error(`Unknown entity: ${entityId}`);
  }
  const relatedEdges = graph.edges.filter((edge) => edge.sourceId === node.id || edge.targetId === node.id);
  const relatedEntityIds = unique(relatedEdges.flatMap((edge) => [edge.sourceId, edge.targetId])).filter((id) => id !== node.id);
  const projects = node.projectIds
    .map((id) => graph.projects.find((project) => project.id === id))
    .filter(Boolean)
    .map((project) => ({ id: project.id, title: project.title, domain: project.domain, year: project.year }));

  return {
    entity: pickNode(node),
    projects,
    relatedEntities: relatedEntityIds
      .map((id) => graph.nodes.find((candidate) => candidate.id === id))
      .filter(Boolean)
      .map(pickNode)
      .sort(sortByLabel),
    citationDois: unique(node.citationDois)
  };
}

function queryGraph(graph, filters = {}) {
  const keyword = normalizeId(filters.keyword || "");
  return graph.nodes
    .filter((node) => !filters.type || node.type === filters.type)
    .filter((node) => !keyword || normalizeId(node.label).includes(keyword))
    .map((node) => ({
      ...pickNode(node),
      projectCount: node.projectIds.length,
      citationCount: unique(node.citationDois).length
    }))
    .sort((a, b) => b.projectCount - a.projectCount || a.label.localeCompare(b.label));
}

function validateProject(project) {
  const required = ["id", "title", "domain", "concepts", "methods", "datasets"];
  for (const key of required) {
    if (!project[key] || (Array.isArray(project[key]) && project[key].length === 0)) {
      throw new Error(`Project ${project.id || "<unknown>"} is missing ${key}`);
    }
  }
}

function buildSuggestedAction(concept, method, dataset, evidence) {
  const projects = evidence.supportingProjectIds.slice(0, 3).join(", ");
  return `Open a review workspace pairing ${concept.label} with ${method.label} on ${dataset.label}; seed it with supporting projects ${projects}.`;
}

function pickNode(node) {
  return {
    id: node.id,
    type: node.type,
    label: node.label
  };
}

function combinations(items, size) {
  if (size !== 2) {
    throw new Error("Only pair combinations are supported");
  }
  const pairs = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

function intersection(...lists) {
  if (!lists.length) return [];
  return unique(lists[0]).filter((value) => lists.every((list) => list.includes(value)));
}

function shared(left, right) {
  return unique(left).filter((value) => right.includes(value));
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ""))];
}

function average(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (!usable.length) return 0;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function sortByLabel(a, b) {
  return a.label.localeCompare(b.label) || a.type.localeCompare(b.type);
}

module.exports = {
  buildEntityPage,
  buildKnowledgeGraph,
  buildRecommendationDigest,
  findKnowledgeGaps,
  queryGraph,
  normalizeId
};
