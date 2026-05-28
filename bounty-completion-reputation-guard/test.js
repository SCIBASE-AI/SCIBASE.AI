const assert = require("assert");
const { completions } = require("./sample-data");
const { reviewCompletion, reviewCompletions } = require("./index");

function byId(report, id) {
  return report.results.find((result) => result.completionId === id);
}

function hasFinding(result, code) {
  return result.findings.some((finding) => finding.code === code);
}

function runTests() {
  const clean = reviewCompletion(completions[0]);
  assert.strictEqual(clean.decision, "award-final-credit");
  assert.strictEqual(clean.reputationDelta, 87);

  const report = reviewCompletions(completions);
  assert.strictEqual(report.summary.completionsReviewed, 5);
  assert.strictEqual(report.summary.finalCredits, 1);
  assert.strictEqual(report.summary.provisionalCredits, 1);
  assert.strictEqual(report.summary.blockedCredits, 3);
  assert.strictEqual(report.summary.totalReputationDelta, 109);

  const unpaid = byId(report, "completion-unpaid-accepted");
  assert.strictEqual(unpaid.decision, "provisional-credit");
  assert.ok(hasFinding(unpaid, "settlement-not-paid"));
  assert.ok(hasFinding(unpaid, "ip-release-not-final"));
  assert.ok(hasFinding(unpaid, "missing-settlement-receipt"));

  const appeal = byId(report, "completion-appeal-hold");
  assert.strictEqual(appeal.decision, "block-reputation-credit");
  assert.ok(hasFinding(appeal, "appeal-open"));
  assert.ok(hasFinding(appeal, "missing-arbitration-digest"));

  const duplicate = byId(report, "completion-duplicate-team-credit");
  assert.strictEqual(duplicate.decision, "block-reputation-credit");
  assert.ok(hasFinding(duplicate, "invalid-team-share"));
  assert.ok(hasFinding(duplicate, "duplicate-completion-credit"));

  const rejected = byId(report, "completion-rejected-submission");
  assert.strictEqual(rejected.decision, "block-reputation-credit");
  assert.ok(hasFinding(rejected, "missing-sponsor-acceptance"));

  console.log("bounty completion reputation guard tests passed");
}

runTests();
