"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeResearchAssistantSuite } = require("./src/protocol-trace");

const samplePath = path.join(__dirname, "sample-data.json");
const bundle = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = analyzeResearchAssistantSuite(bundle);

console.log("Research Assistant Protocol Trace Demo");
console.log("======================================");
console.log(`Assistant run: ${report.assistantRunId}`);
console.log(`Readiness score: ${report.readinessScore}`);
console.log(`Release decision: ${report.releaseDecision}`);
console.log(`Reproducibility: ${report.reproducibility.confidenceBand} (${report.reproducibility.confidenceScore}/100)`);
console.log("");

console.log("Claim trace");
for (const trace of report.claimTraces) {
  const drift = trace.driftSignals.length ? ` | drift: ${trace.driftSignals.join("; ")}` : "";
  console.log(`- ${trace.claimId}: ${trace.status} -> ${trace.matchedCommitmentId || "no protocol match"} (${trace.alignmentScore})${drift}`);
}
console.log("");

console.log("Peer-review recommendations");
for (const item of report.peerReview.recommendations) {
  console.log(`- [${item.severity}] ${item.topic}: ${item.message}`);
}
console.log("");

console.log("Research opportunities");
for (const gap of report.researchGaps) {
  console.log(`- ${gap.topic} (${gap.opportunityScore}): ${gap.openQuestion}`);
}
console.log("");

console.log(`Audit digest: ${report.auditDigest}`);
