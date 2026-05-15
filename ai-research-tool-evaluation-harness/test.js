"use strict";

const assert = require("node:assert/strict");
const sampleBundle = require("./sample-data.json");
const {
  evaluateResearchToolRun,
  stableHash,
} = require("./src/research-tool-evaluation-harness");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const blocked = evaluateResearchToolRun(sampleBundle);

assert.equal(blocked.decision, "review-required");
assert.equal(blocked.score < 100, true);
assert.match(blocked.auditDigest, /^sha256:[a-f0-9]{64}$/);
assert(blocked.actionQueue.some((item) => item.findingId === "data-availability-missing"));
assert(blocked.actionQueue.some((item) => item.findingId === "required-claim-citation-missing"));
assert(blocked.actionQueue.some((item) => item.findingId === "layperson-jargon"));
assert.equal(blocked.peerReviewReport.decision, "blocked");
assert.equal(blocked.citationReport.decision, "blocked");

const readyBundle = clone(sampleBundle);
readyBundle.toolOutputs.summaries.push({
  mode: "executive",
  text: "Night-shift workers showed higher kynurenine and lower phosphatidylcholine levels after adjustment for age, caffeine intake, and body mass index.",
  evidenceIds: ["ev-objective", "ev-result"],
  keyFindings: ["Night-shift staff had different blood chemistry markers"],
  implications: ["The result can guide follow-up studies"],
  nextSteps: ["Add confidence intervals and data availability text"],
});
readyBundle.toolOutputs.summaries[1].text = "This paper says night-shift workers showed higher blood marker levels and lower lipid levels after adjustment for age, caffeine, and body size.";
readyBundle.toolOutputs.peerReview.compliance.dataAvailability = "De-identified tables and analysis scripts will be deposited in the project repository before publication.";
readyBundle.toolOutputs.citations.push({
  claimId: "claim-causal-sleep",
  sourceId: "ev-result",
  style: "Nature",
  formatted: "1. Nguyen Lab. Results. 2026;",
  confidence: 0.82,
  evidenceIds: ["ev-result"],
  insertAfter: "phosphatidylcholine decrease",
});
readyBundle.claims[1].text = "Sleep disruption may be associated with the observed phosphatidylcholine decrease.";
readyBundle.claims[1].evidenceIds = ["ev-result"];

const ready = evaluateResearchToolRun(readyBundle);

assert.equal(ready.decision, "ready-for-assisted-use");
assert.equal(ready.score, 100);
assert.equal(ready.actionQueue.length, 0);
assert.equal(ready.summaryReports.every((report) => report.decision === "ready"), true);
assert.equal(ready.peerReviewReport.decision, "ready");
assert.equal(ready.citationReport.decision, "ready");
assert.notEqual(blocked.auditDigest, ready.auditDigest);
assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }));

console.log("ai research tool evaluation harness tests passed");
