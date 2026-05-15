"use strict";

const sampleBundle = require("./sample-data.json");
const {
  analyzeInstitutionalAccess,
} = require("./src/institutional-access-recertification");

const result = analyzeInstitutionalAccess(sampleBundle);

console.log(`Project: ${result.projectName}`);
console.log(`Decision: ${result.decision}`);
console.log(`Audit digest: ${result.auditDigest}`);
console.log("");
console.log("Member actions:");
for (const action of result.memberActions) {
  console.log(`- ${action.email}: ${action.recommendedAction} (${action.blockerCount} blocker, ${action.warningCount} warning)`);
}
console.log("");
console.log("Findings:");
for (const finding of result.findings) {
  console.log(`- [${finding.severity}] ${finding.memberId} ${finding.id}: ${finding.title}`);
  console.log(`  detail: ${finding.detail}`);
  console.log(`  remediation: ${finding.remediation}`);
}
