"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  arbitrateKnowledgeGraph,
  evidenceScore,
  relationshipKey,
  validateGraph
} = require("../src/conflict-arbiter");

const graph = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/sample-graph.json"), "utf8"));
validateGraph(graph);

const packet = arbitrateKnowledgeGraph(graph, { asOfDate: "2026-05-15" });
assert.equal(packet.graphId, "kg-crispr-neuro-2026");
assert.equal(packet.summary.relationshipGroups, 3);
assert.equal(packet.summary.conflicts, 1);
assert.equal(packet.summary.quarantined, 1);
assert.equal(packet.summary.suppressedRecommendations, 1);
assert.equal(packet.summary.curatorActions, 2);
assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);

const conflict = packet.arbitrations.find((item) => item.predicate === "improves-model-for");
assert.equal(conflict.hasConflict, true);
assert.equal(conflict.decision, "quarantine-for-curation");
assert.equal(conflict.winner, "supports");
assert.ok(conflict.margin < 0.3);
assert.equal(conflict.leadingEvidence.length, 2);
assert.match(conflict.leadingEvidence[0].auditHash, /^[a-f0-9]{64}$/);

const lineage = packet.arbitrations.find((item) => item.predicate === "reuses-protocol");
assert.equal(lineage.hasConflict, false);
assert.equal(lineage.decision, "accept");
assert.ok(lineage.supportScore > 1.4);

const weak = packet.arbitrations.find((item) => item.predicate === "requires-dataset");
assert.equal(weak.decision, "low-confidence-review");
assert.equal(weak.leadingEvidence[0].evidenceType, "weak-text-mention");

const rec1 = packet.recommendationDecisions.find((item) => item.id === "rec-1");
assert.equal(rec1.action, "suppress-until-curated");
const rec2 = packet.recommendationDecisions.find((item) => item.id === "rec-2");
assert.equal(rec2.action, "allow-with-provenance");

assert.equal(relationshipKey(graph.relationships[0]), "method-crispr-prime-editing::improves-model-for::disease-parkinsons");
assert.ok(evidenceScore(graph.relationships[0], "2026-05-15", 365) > evidenceScore(graph.relationships[4], "2026-05-15", 365));

console.log("knowledge-graph-conflict-arbiter tests passed");
