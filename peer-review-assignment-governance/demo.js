"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeReviewAssignmentGovernance } = require("./src/review-assignment-governance");

const samplePath = path.join(__dirname, "sample-data.json");
const bundle = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = analyzeReviewAssignmentGovernance(bundle);

console.log("Peer Review Assignment Governance Demo");
console.log("======================================");
console.log(`Project: ${report.projectId}`);
console.log(`Review mode: ${report.reviewMode}`);
console.log(`Decision: ${report.assignmentDecision}`);
console.log("");

console.log("Selected reviewer slate");
for (const reviewer of report.selectedReviewers) {
  const conflicts = reviewer.conflictReasons.length
    ? ` | disclosures: ${reviewer.conflictReasons.map((reason) => reason.code).join(", ")}`
    : "";
  console.log(`- ${reviewer.blindLabel}: ${reviewer.status} score ${reviewer.score}${conflicts}`);
  console.log(`  coverage: ${reviewer.coverage.topics.concat(reviewer.coverage.methods).join("; ") || "general"}`);
}
console.log("");

console.log("Blocked reviewers");
for (const reviewer of report.blockedReviewers) {
  console.log(`- ${reviewer.reviewerId}: ${reviewer.conflictReasons.map((reason) => reason.code).join(", ")}`);
}
console.log("");

console.log("Chair checklist");
for (const item of report.chairChecklist) {
  console.log(`- [${item.status}] ${item.id}: ${item.message}`);
}
console.log("");

console.log(`Covered priority topics: ${report.coverage.covered.join(", ")}`);
console.log(`Missing priority topics: ${report.coverage.missing.join(", ") || "none"}`);
console.log(`Audit digest: ${report.auditDigest}`);
