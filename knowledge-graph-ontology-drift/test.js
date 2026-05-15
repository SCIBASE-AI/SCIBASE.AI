"use strict";

const assert = require("node:assert/strict");
const sampleBundle = require("./sample-data.json");
const {
  analyzeOntologyDrift,
  stableHash,
} = require("./src/knowledge-graph-ontology-drift");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ids(result) {
  return new Set(result.findings.map((finding) => finding.id));
}

const drift = analyzeOntologyDrift(sampleBundle);
const driftIds = ids(drift);

assert.equal(drift.decision, "migration-required");
assert.match(drift.auditDigest, /^sha256:[a-f0-9]{64}$/);
assert.equal(drift.impactScore, 0.6);
assert(driftIds.has("deprecated-concept-in-use"));
assert(driftIds.has("synonym-collision"));
assert(driftIds.has("stale-recommendation-path"));
assert(driftIds.has("relationship-evidence-stale"));
assert.equal(drift.migrationActions.length, 3);

const currentBundle = clone(sampleBundle);
currentBundle.ontologyRelease.deprecatedConcepts = [];
currentBundle.ontologyRelease.concepts[2].synonyms = ["spatial panel assay"];
currentBundle.graphNodes[0].conceptIds[0] = "concept:single-cell-rna-seq";
currentBundle.relationships[0].conceptIds[0] = "concept:single-cell-rna-seq";
currentBundle.relationships[0].evidenceDate = "2026-04-10T00:00:00.000Z";
currentBundle.recommendations[0].conceptPath[0] = "concept:single-cell-rna-seq";

const current = analyzeOntologyDrift(currentBundle);
assert.equal(current.decision, "graph-current");
assert.equal(current.findings.length, 0);
assert.equal(current.migrationActions.length, 0);
assert.equal(current.impactScore, 0);
assert.notEqual(drift.auditDigest, current.auditDigest);
assert.equal(stableHash({ z: 1, a: ["b"] }), stableHash({ a: ["b"], z: 1 }));

console.log("knowledge graph ontology drift tests passed");
