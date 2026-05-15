"use strict";

const sampleBundle = require("./sample-data.json");
const {
  analyzeOntologyDrift,
} = require("./src/knowledge-graph-ontology-drift");

const result = analyzeOntologyDrift(sampleBundle);

console.log(`Ontology release: ${result.previousVersion} -> ${result.nextVersion}`);
console.log(`Decision: ${result.decision}`);
console.log(`Impact score: ${result.impactScore}`);
console.log(`Audit digest: ${result.auditDigest}`);
console.log("");
console.log("Migration actions:");
for (const action of result.migrationActions) {
  console.log(`- ${action.type} ${action.targetId}`);
}
console.log("");
console.log("Findings:");
for (const finding of result.findings) {
  console.log(`- [${finding.severity}] ${finding.id}: ${finding.title}`);
  console.log(`  detail: ${finding.detail}`);
  console.log(`  remediation: ${finding.remediation}`);
}
