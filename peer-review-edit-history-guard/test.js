const assert = require("assert");
const { sampleReviewBatch } = require("./sample-data");
const {
  buildEditHistoryReport,
  score,
  containsIdentityLeak,
  anonymizeReviewer,
  digest
} = require("./index");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testNonReviewerEditFreezesReputation() {
  const report = buildEditHistoryReport(sampleReviewBatch);
  const decision = report.reviewDecisions.find((item) => item.reviewId === "comment-404");
  assert.strictEqual(decision.reputationDecision.status, "freeze");
  assert.strictEqual(decision.severity, "blocker");
  assert(decision.findings.some((finding) => finding.type === "non_reviewer_edit"));
}

function testLateScoreChangeRoutesToSteward() {
  const report = buildEditHistoryReport(sampleReviewBatch);
  const decision = report.reviewDecisions.find((item) => item.reviewId === "review-202");
  assert.strictEqual(decision.reputationDecision.status, "steward_review");
  assert(decision.findings.some((finding) => finding.type === "edit_window_expired"));
  assert(decision.findings.some((finding) => finding.type === "large_score_delta"));
}

function testIdentityLeakRequiresStewardReview() {
  const report = buildEditHistoryReport(sampleReviewBatch);
  const decision = report.reviewDecisions.find((item) => item.reviewId === "review-303");
  assert.strictEqual(decision.severity, "high");
  assert(decision.findings.some((finding) => finding.type === "identity_leak_in_edit"));
  assert(decision.reviewerRef.startsWith("anon_"));
}

function testCleanBatchPasses() {
  const clean = clone(sampleReviewBatch);
  clean.reviews = [clean.reviews[0]];
  clean.reviews[0].authorRespondedAt = null;
  const report = buildEditHistoryReport(clean);
  assert.strictEqual(report.releaseGate.status, "pass");
  assert.strictEqual(report.summary.score, 100);
  assert.strictEqual(report.actions.length, 0);
}

function testUtilitiesAreDeterministic() {
  assert.strictEqual(score({ clarity: 4, rigor: 4, novelty: 2, reproducibility: 4 }), 3.5);
  assert.strictEqual(containsIdentityLeak("contact me at reviewer@example.invalid", "anonymous"), true);
  assert.strictEqual(containsIdentityLeak("public email is allowed", "public"), false);
  assert.notStrictEqual(anonymizeReviewer("reviewer-x", "anonymous"), "reviewer-x");
  assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
}

testNonReviewerEditFreezesReputation();
testLateScoreChangeRoutesToSteward();
testIdentityLeakRequiresStewardReview();
testCleanBatchPasses();
testUtilitiesAreDeterministic();

console.log("5 peer-review edit-history guard tests passed");
