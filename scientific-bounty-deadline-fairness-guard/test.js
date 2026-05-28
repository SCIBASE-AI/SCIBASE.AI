const assert = require("assert");
const { challenges } = require("./sample-data");
const { evaluateChallenge, evaluateChallenges, hasExplicitTimezone } = require("./index");

function byId(report, id) {
  return report.results.find((result) => result.challengeId === id);
}

function runTests() {
  assert.strictEqual(hasExplicitTimezone("2026-06-01T17:00:00Z"), true);
  assert.strictEqual(hasExplicitTimezone("2026-06-01T17:00:00-05:00"), true);
  assert.strictEqual(hasExplicitTimezone("2026-06-01 17:00"), false);

  const report = evaluateChallenges(challenges);
  assert.strictEqual(report.summary.challengeCount, 4);

  const fair = byId(report, "climate-catalyst-forecast");
  assert.strictEqual(fair.decision, "clear-for-scoring");
  assert.strictEqual(fair.fairnessScore, 100);
  assert.ok(fair.submissions.some((submission) => submission.decision === "accept-valid-extension-window"));
  assert.strictEqual(fair.extension.noticeCoverage.every((notice) => notice.status === "on-time"), true);

  const privateExtension = byId(report, "single-cell-biomarker-race");
  assert.strictEqual(privateExtension.decision, "hold-arbitration");
  assert.ok(privateExtension.issues.some((issue) => issue.code === "private-extension"));
  assert.ok(privateExtension.issues.some((issue) => issue.code === "missing-team-notice"));
  assert.ok(privateExtension.issues.some((issue) => issue.code === "accepted-after-current-cutoff"));
  assert.ok(
    privateExtension.submissions.some(
      (submission) => submission.decision === "hold-accepted-under-invalid-extension",
    ),
  );

  const late = byId(report, "quantum-noise-cutoff");
  assert.strictEqual(late.decision, "reject-late-submissions");
  assert.ok(late.submissions.some((submission) => submission.decision === "reject-late"));

  const ambiguous = byId(report, "materials-ambiguous-cutoff");
  assert.strictEqual(ambiguous.decision, "hold-arbitration");
  assert.ok(ambiguous.issues.some((issue) => issue.code === "ambiguous-timezone"));
  assert.ok(ambiguous.issues.some((issue) => issue.code === "late-team-notice"));
  assert.ok(ambiguous.issues.some((issue) => issue.code === "accepted-under-invalid-extension"));

  const single = evaluateChallenge(challenges[0]);
  assert.strictEqual(single.actions[0], "Proceed to scoring with the normalized current deadline.");

  console.log("deadline fairness guard tests passed");
}

runTests();
