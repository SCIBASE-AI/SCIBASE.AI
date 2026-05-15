"use strict";

const sampleBundle = require("./sample-data.json");
const {
  analyzeRevenueTaxControls,
} = require("./src/revenue-tax-exemption-controls");

const result = analyzeRevenueTaxControls(sampleBundle);

console.log(`Decision: ${result.decision}`);
console.log(`Audit digest: ${result.auditDigest}`);
console.log("");
console.log("Invoice summaries:");
for (const summary of result.invoiceSummaries) {
  console.log(`- ${summary.invoiceId}: ${summary.recommendedAction} (${summary.blockerCount} blocker, ${summary.warningCount} warning)`);
}
console.log("");
console.log("Findings:");
for (const finding of result.findings) {
  console.log(`- [${finding.severity}] ${finding.invoiceId} ${finding.id}: ${finding.title}`);
  console.log(`  detail: ${finding.detail}`);
  console.log(`  remediation: ${finding.remediation}`);
}
