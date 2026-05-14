import crypto from "node:crypto";

const STALE_RELATIONSHIP_DAYS = 180;

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashEvidence(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16)}`;
}

export function normalizeEntityLabel(label, aliases = {}) {
  const normalized = label
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");

  for (const [canonical, values] of Object.entries(aliases)) {
    const normalizedAliases = values.map((value) => value.toLowerCase().replace(/[^a-z0-9:]+/g, " ").trim().replace(/\s+/g, "-"));
    if (canonical === normalized || normalizedAliases.includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
}

export function buildNormalizedEntities(snapshot) {
  return snapshot.entities.map((entity) => ({
    ...entity,
    canonicalKey: entity.ontologyId ?? normalizeEntityLabel(entity.label, snapshot.ontologyAliases),
    normalizedLabel: normalizeEntityLabel(entity.label, snapshot.ontologyAliases),
    jsonLdId: entity.doi ? `https://doi.org/${entity.doi}` : `https://scibase.ai/kg/${entity.id}`,
    schemaType: schemaTypeFor(entity.type),
  }));
}

export function suggestEntityMerges(snapshot) {
  const normalized = buildNormalizedEntities(snapshot);
  const groups = groupBy(normalized, (entity) => `${entity.type}:${entity.canonicalKey}`);

  return [...groups.values()]
    .filter((entities) => entities.length > 1)
    .filter((entities) => {
      if (entities.every((entity) => entity.type === "dataset")) {
        const dois = new Set(entities.map((entity) => entity.doi).filter(Boolean));
        return dois.size <= 1;
      }
      return true;
    })
    .map((entities) => {
      const canonical = [...entities].sort((a, b) => b.confidence - a.confidence)[0];
      const duplicates = entities.filter((entity) => entity.id !== canonical.id);
      return {
        canonicalId: canonical.id,
        duplicateIds: duplicates.map((entity) => entity.id),
        entityType: canonical.type,
        reason: canonical.ontologyId ? "shared-ontology-id" : "shared-normalized-label",
        confidence: Math.round((canonical.confidence + average(duplicates.map((entity) => entity.confidence))) * 50),
        evidenceHash: hashEvidence(entities.map((entity) => ({ id: entity.id, label: entity.label, ontologyId: entity.ontologyId, doi: entity.doi }))),
      };
    });
}

export function scoreRelationshipEvidence(relationship) {
  const evidence = relationship.evidence ?? [];
  const confidence = average(evidence.map((item) => item.confidence));
  const sourceDiversity = new Set(evidence.map((item) => item.sourceId)).size;
  const evidenceVolume = Math.min(25, evidence.length * 12);
  const sourceScore = Math.min(20, sourceDiversity * 10);
  const confidenceScore = Math.round(confidence * 55);

  return Math.max(0, Math.min(100, evidenceVolume + sourceScore + confidenceScore));
}

export function auditRelationships(snapshot) {
  const entityIds = new Set(snapshot.entities.map((entity) => entity.id));
  const now = new Date(snapshot.generatedAt).getTime();

  return snapshot.relationships.map((relationship) => {
    const missingEndpoint = !entityIds.has(relationship.to) || (!entityIds.has(relationship.from) && !relationship.from.startsWith("paper-") && !relationship.from.startsWith("notebook-"));
    const ageDays = Math.floor((now - new Date(relationship.lastVerifiedAt).getTime()) / 86_400_000);
    const stale = ageDays > STALE_RELATIONSHIP_DAYS;
    const score = scoreRelationshipEvidence(relationship);
    const status = missingEndpoint ? "broken" : stale ? "stale" : score < 65 ? "weak-evidence" : "trusted";
    const requiredActions = [];

    if (missingEndpoint) requiredActions.push("repair-missing-endpoint");
    if (stale) requiredActions.push("refresh-relationship-verification");
    if (score < 65) requiredActions.push("add-evidence-source");

    return {
      relationshipId: relationship.id,
      type: relationship.type,
      from: relationship.from,
      to: relationship.to,
      evidenceScore: score,
      ageDays,
      status,
      requiredActions,
      evidenceHash: hashEvidence(relationship.evidence),
    };
  });
}

export function auditReferences(snapshot) {
  return snapshot.references.map((reference) => ({
    ...reference,
    status: reference.status,
    requiredAction: reference.status === "superseded" ? "replace-with-current-doi" : "none",
    evidenceHash: hashEvidence(reference),
  }));
}

export function explainGraphQuery(snapshot, queryId) {
  const query = snapshot.savedQueries.find((item) => item.id === queryId) ?? snapshot.savedQueries[0];
  if (!query) {
    throw new Error("No saved graph query available");
  }
  const normalizedEntities = buildNormalizedEntities(snapshot);
  const auditedRelationships = auditRelationships(snapshot);
  const termKeys = query.terms.map((term) => normalizeEntityLabel(term, snapshot.ontologyAliases));
  const matchedEntities = normalizedEntities.filter((entity) => termKeys.includes(entity.normalizedLabel) || termKeys.includes(entity.canonicalKey));
  const trustedRelationships = auditedRelationships.filter((relationship) => relationship.evidenceScore >= query.filters.minRelationshipScore && relationship.status === "trusted");
  const explanationSteps = [
    `Normalized ${query.terms.length} query terms into ${termKeys.join(", ")}`,
    `Matched ${matchedEntities.length} graph entities`,
    `Filtered ${auditedRelationships.length} relationships down to ${trustedRelationships.length} trusted edges`,
  ];

  return {
    queryId: query.id,
    prompt: query.prompt,
    matchedEntities: matchedEntities.map((entity) => ({ id: entity.id, label: entity.label, type: entity.type, canonicalKey: entity.canonicalKey })),
    trustedRelationships,
    explanationSteps,
    explanationHash: hashEvidence({ query, matchedEntities, trustedRelationships }),
  };
}

export function buildRecommendationProvenance(snapshot) {
  const normalizedEntities = buildNormalizedEntities(snapshot);
  const audits = auditRelationships(snapshot);
  const seed = snapshot.recommendationSeed;
  const seedEntities = new Set(seed.recentEntities);

  const recommendations = normalizedEntities
    .filter((entity) => !seedEntities.has(entity.id))
    .map((entity) => {
      const inbound = audits.filter((relationship) => relationship.to === entity.id);
      const evidenceScore = inbound.length ? Math.round(average(inbound.map((relationship) => relationship.evidenceScore))) : Math.round(entity.confidence * 50);
      const domainBoost = seed.domainInterests.some((interest) => entity.label.toLowerCase().includes(interest)) ? 10 : 0;
      return {
        entityId: entity.id,
        label: entity.label,
        type: entity.type,
        score: Math.min(100, evidenceScore + domainBoost),
        why: [
          inbound.length ? `connected-by:${inbound.map((relationship) => relationship.relationshipId).join(",")}` : "semantic-neighbor",
          entity.ontologyId ? `ontology:${entity.ontologyId}` : null,
          entity.doi ? `doi:${entity.doi}` : null,
        ].filter(Boolean),
      };
    })
    .filter((recommendation) => recommendation.score >= 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    userId: seed.userId,
    recommendations,
    provenanceHash: hashEvidence({ seed, recommendations }),
  };
}

export function buildRemediationQueue(snapshot) {
  const merges = suggestEntityMerges(snapshot).map((merge) => ({
    id: `merge:${merge.canonicalId}`,
    type: "entity-merge",
    priority: merge.confidence >= 85 ? "high" : "normal",
    summary: `Merge ${merge.duplicateIds.join(", ")} into ${merge.canonicalId}`,
    evidenceHash: merge.evidenceHash,
  }));
  const relationshipActions = auditRelationships(snapshot)
    .filter((audit) => audit.status !== "trusted")
    .map((audit) => ({
      id: `relationship:${audit.relationshipId}`,
      type: "relationship-repair",
      priority: audit.status === "stale" || audit.status === "broken" ? "high" : "normal",
      summary: `${audit.relationshipId} is ${audit.status}`,
      requiredActions: audit.requiredActions,
      evidenceHash: audit.evidenceHash,
    }));
  const referenceActions = auditReferences(snapshot)
    .filter((reference) => reference.requiredAction !== "none")
    .map((reference) => ({
      id: `reference:${reference.doi}`,
      type: "reference-refresh",
      priority: "high",
      summary: `${reference.doi} should be replaced by ${reference.supersededBy}`,
      requiredActions: [reference.requiredAction],
      evidenceHash: reference.evidenceHash,
    }));
  const queueItems = [...merges, ...relationshipActions, ...referenceActions];

  return {
    snapshotId: snapshot.id,
    totalItems: queueItems.length,
    highPriorityItems: queueItems.filter((item) => item.priority === "high").length,
    queueItems,
    queueHash: hashEvidence(queueItems),
  };
}

export function buildJsonLdExport(snapshot) {
  const entities = buildNormalizedEntities(snapshot);
  const graph = entities.map((entity) => ({
    "@id": entity.jsonLdId,
    "@type": entity.schemaType,
    name: entity.label,
    identifier: entity.ontologyId ?? entity.doi ?? entity.orcid ?? entity.id,
    sameAs: entity.doi ? [`https://doi.org/${entity.doi}`] : [],
  }));

  return {
    "@context": "https://schema.org",
    "@graph": graph,
    exportHash: hashEvidence(graph),
  };
}

export function buildGraphAuditPacket(snapshot) {
  const normalizedEntities = buildNormalizedEntities(snapshot);
  const mergeSuggestions = suggestEntityMerges(snapshot);
  const relationshipAudit = auditRelationships(snapshot);
  const referenceAudit = auditReferences(snapshot);
  const queryExplanation = explainGraphQuery(snapshot, snapshot.savedQueries[0]?.id);
  const recommendations = buildRecommendationProvenance(snapshot);
  const remediationQueue = buildRemediationQueue(snapshot);
  const jsonLd = buildJsonLdExport(snapshot);

  return {
    packetVersion: "knowledge-graph-link-audit/v0.1",
    snapshotId: snapshot.id,
    generatedAt: snapshot.generatedAt,
    normalizedEntityCount: normalizedEntities.length,
    mergeSuggestions,
    relationshipAudit,
    referenceAudit,
    queryExplanation,
    recommendations,
    remediationQueue,
    jsonLd,
    auditHash: hashEvidence({ normalizedEntities, mergeSuggestions, relationshipAudit, referenceAudit, queryExplanation, recommendations, remediationQueue }),
  };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function groupBy(values, getKey) {
  const groups = new Map();
  for (const value of values) {
    const key = getKey(value);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(value);
  }
  return groups;
}

function schemaTypeFor(type) {
  if (type === "dataset") return "Dataset";
  if (type === "author") return "Person";
  if (type === "tool") return "SoftwareApplication";
  if (type === "protocol") return "HowTo";
  return "DefinedTerm";
}
