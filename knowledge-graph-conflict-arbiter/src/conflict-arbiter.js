"use strict";

const crypto = require("node:crypto");

const EVIDENCE_WEIGHTS = {
  "replicated-experiment": 1.0,
  "replication-failure": 0.95,
  "dataset-lineage": 0.9,
  "curator-assertion": 0.82,
  "weak-text-mention": 0.35
};

function stableStringify(value) {
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function validateGraph(graph) {
  const issues = [];
  if (!graph || typeof graph !== "object") issues.push("graph");
  if (!graph.graphId) issues.push("graphId");
  if (!Array.isArray(graph.entities)) issues.push("entities");
  if (!Array.isArray(graph.relationships)) issues.push("relationships");
  if (!Array.isArray(graph.recommendations)) issues.push("recommendations");

  for (const edge of graph.relationships || []) {
    for (const field of ["id", "subject", "predicate", "object", "polarity", "evidenceType", "sourceDate"]) {
      if (!edge[field]) issues.push((edge.id || "unknown") + "." + field);
    }
    if (typeof edge.confidence !== "number") issues.push((edge.id || "unknown") + ".confidence");
  }

  if (issues.length) throw new Error("Invalid graph: " + issues.join(", "));
}

function daysBetween(laterIso, earlierIso) {
  const later = Date.parse(laterIso + "T00:00:00.000Z");
  const earlier = Date.parse(earlierIso + "T00:00:00.000Z");
  return Math.max(0, Math.round((later - earlier) / 86400000));
}

function freshnessScore(edge, asOfDate, halfLifeDays) {
  const age = daysBetween(asOfDate, edge.sourceDate);
  return Math.pow(0.5, age / halfLifeDays);
}

function evidenceScore(edge, asOfDate, halfLifeDays) {
  const evidenceWeight = EVIDENCE_WEIGHTS[edge.evidenceType] || 0.5;
  const citationBoost = Math.min(0.18, Math.log10((edge.citationCount || 0) + 1) * 0.08);
  const raw = edge.confidence * evidenceWeight * freshnessScore(edge, asOfDate, halfLifeDays) + citationBoost;
  return Math.max(0, Math.min(1, Number(raw.toFixed(4))));
}

function relationshipKey(edge) {
  return [edge.subject, edge.predicate, edge.object].join("::");
}

function groupRelationships(relationships) {
  const groups = new Map();
  for (const edge of relationships) {
    const key = relationshipKey(edge);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(edge);
  }
  return groups;
}

function summarizeGroup(key, edges, asOfDate, halfLifeDays) {
  const scored = edges.map((edge) => ({
    ...edge,
    evidenceScore: evidenceScore(edge, asOfDate, halfLifeDays),
    auditHash: digest(edge)
  })).sort((a, b) => b.evidenceScore - a.evidenceScore);
  const supporting = scored.filter((edge) => edge.polarity === "supports");
  const refuting = scored.filter((edge) => edge.polarity === "refutes");
  const supportScore = Number(supporting.reduce((sum, edge) => sum + edge.evidenceScore, 0).toFixed(4));
  const refuteScore = Number(refuting.reduce((sum, edge) => sum + edge.evidenceScore, 0).toFixed(4));
  const margin = Number(Math.abs(supportScore - refuteScore).toFixed(4));
  const hasConflict = supporting.length > 0 && refuting.length > 0;
  const winner = supportScore >= refuteScore ? "supports" : "refutes";
  let decision = "accept";
  if (hasConflict && margin < 0.3) decision = "quarantine-for-curation";
  else if (hasConflict) decision = winner === "supports" ? "accept-with-conflict-note" : "suppress-relationship";
  else if (scored[0].evidenceScore < 0.5) decision = "low-confidence-review";

  return {
    key,
    subject: scored[0].subject,
    predicate: scored[0].predicate,
    object: scored[0].object,
    edgeIds: scored.map((edge) => edge.id),
    supportScore,
    refuteScore,
    margin,
    hasConflict,
    decision,
    winner,
    leadingEvidence: scored.slice(0, 3).map((edge) => ({
      id: edge.id,
      polarity: edge.polarity,
      evidenceType: edge.evidenceType,
      evidenceScore: edge.evidenceScore,
      source: edge.source,
      sourceDate: edge.sourceDate,
      auditHash: edge.auditHash
    }))
  };
}

function explainRecommendation(recommendation, arbitrationByEdge) {
  const related = recommendation.dependsOnEdges.map((edgeId) => arbitrationByEdge.get(edgeId)).filter(Boolean);
  const quarantined = related.filter((item) => item.decision === "quarantine-for-curation" || item.decision === "suppress-relationship");
  return {
    id: recommendation.id,
    topic: recommendation.topic,
    action: quarantined.length ? "suppress-until-curated" : "allow-with-provenance",
    reasons: quarantined.length
      ? quarantined.map((item) => item.key + " -> " + item.decision)
      : related.map((item) => item.key + " -> " + item.decision),
    text: recommendation.text
  };
}

function curatorActions(arbitrations) {
  const actions = [];
  for (const item of arbitrations) {
    if (item.decision === "quarantine-for-curation") {
      actions.push({
        type: "curator-review",
        target: item.key,
        message: "Conflicting support/refute evidence is too close; require curator decision before graph search or recommendations use this edge."
      });
    }
    if (item.decision === "suppress-relationship") {
      actions.push({
        type: "relationship-suppression",
        target: item.key,
        message: "Refuting evidence dominates; suppress relationship and show conflict note on entity pages."
      });
    }
    if (item.decision === "low-confidence-review") {
      actions.push({
        type: "low-confidence-review",
        target: item.key,
        message: "Only weak or stale evidence is available; request stronger evidence before promotion."
      });
    }
  }
  return actions;
}

function arbitrateKnowledgeGraph(graph, options = {}) {
  validateGraph(graph);
  const asOfDate = options.asOfDate || "2026-05-15";
  const halfLifeDays = options.freshnessHalfLifeDays || graph.freshnessHalfLifeDays || 365;
  const groups = groupRelationships(graph.relationships);
  const arbitrations = Array.from(groups.entries()).map(([key, edges]) => summarizeGroup(key, edges, asOfDate, halfLifeDays));
  const arbitrationByEdge = new Map();
  for (const item of arbitrations) {
    for (const edgeId of item.edgeIds) arbitrationByEdge.set(edgeId, item);
  }
  const recommendationDecisions = graph.recommendations.map((recommendation) => explainRecommendation(recommendation, arbitrationByEdge));
  const actions = curatorActions(arbitrations);
  const packet = {
    graphId: graph.graphId,
    asOfDate,
    summary: {
      relationshipGroups: arbitrations.length,
      conflicts: arbitrations.filter((item) => item.hasConflict).length,
      quarantined: arbitrations.filter((item) => item.decision === "quarantine-for-curation").length,
      suppressedRecommendations: recommendationDecisions.filter((item) => item.action === "suppress-until-curated").length,
      curatorActions: actions.length
    },
    arbitrations,
    recommendationDecisions,
    actions
  };
  return {
    ...packet,
    auditDigest: digest(packet)
  };
}

module.exports = {
  EVIDENCE_WEIGHTS,
  arbitrateKnowledgeGraph,
  digest,
  evidenceScore,
  freshnessScore,
  relationshipKey,
  stableStringify,
  validateGraph
};
