const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildProtocolTraceReport, validateStudyPackage } = require("../src/protocol-trace");

const samplePath = path.join(__dirname, "..", "data", "sample-study.json");
const study = JSON.parse(fs.readFileSync(samplePath, "utf8"));

const report = buildProtocolTraceReport(study);

assert.equal(report.validation.status, "passed");
assert.equal(report.registrationId, "OSF-SCNC-7421");
assert.equal(report.claims.length, 3);
assert.equal(report.decision, "hold");

const primaryClaim = report.claims.find((claim) => claim.id === "claim-inflammatory-drop");
assert.equal(primaryClaim.protocolStatus, "registered-primary");
assert.equal(primaryClaim.analysisStatus.status, "matches-registered-analysis");
assert.equal(primaryClaim.evidence.status, "complete-trace");

const posthocClaim = report.claims.find((claim) => claim.id === "claim-off-target-low");
assert.equal(posthocClaim.protocolStatus, "unregistered");
assert.equal(posthocClaim.analysisStatus.status, "posthoc-or-unregistered");
assert.ok(posthocClaim.reportingSignals.some((signal) => signal.id === "underpowered-claim"));
assert.ok(posthocClaim.reportingSignals.some((signal) => signal.id === "threshold-adjacent-pvalue"));

assert.deepEqual(
  report.unreportedOutcomes.map((outcome) => outcome.outcomeId),
  ["outcome-cell-viability"]
);
assert.equal(report.selectiveReporting.status, "review-needed");
assert.ok(report.peerReview.actionItems.some((item) => item.check === "unreported-registered-outcome"));
assert.ok(report.researchGaps[0].title.includes("Cell viability"));

const digestAgain = buildProtocolTraceReport(study).digest;
assert.equal(report.digest, digestAgain);

const incompleteValidation = validateStudyPackage({ projectId: "draft" });
assert.equal(incompleteValidation.status, "incomplete");
assert.ok(incompleteValidation.missing.includes("protocol.registrationId"));

const degradedStudy = JSON.parse(JSON.stringify(study));
degradedStudy.reproducibility.environmentLocked = false;
degradedStudy.claims[0].evidenceArtifactIds = [];
const degradedReport = buildProtocolTraceReport(degradedStudy);
assert.ok(degradedReport.overallScore < report.overallScore);
assert.equal(degradedReport.claims[0].evidence.status, "partial-trace");

console.log("research-protocol-trace tests passed");
