"use strict";

const sampleBundle = require("./sample-data.json");
const {
  analyzeRepositoryReleaseControls,
} = require("./src/repository-release-embargo-controls");

const result = analyzeRepositoryReleaseControls(sampleBundle);

console.log(`Repository: ${result.repositoryName}`);
console.log(`Release: ${result.releaseVersion}`);
console.log(`Decision: ${result.releaseDecision}`);
console.log(`Audit digest: ${result.auditDigest}`);
console.log("");
console.log("Checklist:");
for (const item of result.releaseChecklist) {
  console.log(`- ${item.name}: ${item.status}`);
}
console.log("");
console.log("Findings:");
for (const finding of result.findings) {
  console.log(`- [${finding.severity}] ${finding.id}: ${finding.title}`);
  console.log(`  detail: ${finding.detail}`);
  console.log(`  remediation: ${finding.remediation}`);
}
