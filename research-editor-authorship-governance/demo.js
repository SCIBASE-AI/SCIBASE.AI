"use strict";

const sampleBundle = require("./sample-data.json");
const {
  analyzeAuthorshipGovernance,
} = require("./src/research-editor-authorship-governance");

const result = analyzeAuthorshipGovernance(sampleBundle);

console.log(`Manuscript: ${result.title}`);
console.log(`Target journal: ${result.targetJournal}`);
console.log(`Decision: ${result.decision}`);
console.log(`Audit digest: ${result.auditDigest}`);
console.log("");
console.log("Submission actions:");
for (const action of result.submissionActions) {
  console.log(`- ${action}`);
}
console.log("");
console.log("Findings:");
for (const finding of result.findings) {
  console.log(`- [${finding.severity}] ${finding.id}: ${finding.title}`);
  console.log(`  detail: ${finding.detail}`);
  console.log(`  remediation: ${finding.remediation}`);
}
