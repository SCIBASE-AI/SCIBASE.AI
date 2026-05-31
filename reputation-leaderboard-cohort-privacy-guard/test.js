const assert = require("assert");
const cohorts = require("./sample-data");
const {
  evaluateCohort,
  evaluateCohortBatch,
  institutionCount,
  largestInstitutionShare,
  privacyRiskScore,
} = require("./index");

const report = evaluateCohortBatch(cohorts);

function decision(id) {
  return report.decisions.find((item) => item.cohortId === id);
}

assert.strictEqual(report.summary.total, 5);
assert.strictEqual(report.summary.publish, 1);
assert.strictEqual(report.summary.redact, 1);
assert.strictEqual(report.summary.hold, 3);
assert.strictEqual(report.summary.blockers, 7);
assert.strictEqual(report.summary.warnings, 1);
assert.strictEqual(report.summary.maxPrivacyRiskScore, 89);

const global = decision("leaderboard:bioinformatics-global");
assert.strictEqual(global.decision, "publish");
assert.deepStrictEqual(global.blockers, []);
assert(global.actions.includes("publish leaderboard cohort"));

const smallRegion = decision("leaderboard:rare-disease-region");
assert.strictEqual(smallRegion.decision, "hold");
assert(
  smallRegion.blockers.some((item) => item.includes("below 10 minimum")),
  "small regional cohorts must be held"
);
assert(
  smallRegion.blockers.some((item) => item.includes("sparse badge")),
  "sparse badge combinations should be blocked"
);

const anonymous = decision("leaderboard:institution-anonymous-review");
assert.strictEqual(anonymous.decision, "hold");
assert(
  anonymous.blockers.some((item) => item.includes("anonymous review credit share")),
  "anonymous review credit should not deanonymize reviewers in public rankings"
);

const optout = decision("leaderboard:open-science-optout");
assert.strictEqual(optout.decision, "hold");
assert(
  optout.blockers.some((item) => item.includes("opted out")),
  "opt-out contributors should block publication until removed"
);

const spike = decision("leaderboard:quantum-score-spike");
assert.strictEqual(spike.decision, "redact");
assert(
  spike.warnings.some((item) => item.includes("score delta")),
  "large score jumps should be routed to moderation"
);

assert.strictEqual(institutionCount(cohorts[0]), 4);
assert.strictEqual(largestInstitutionShare(cohorts[0]), 0.38);
assert.strictEqual(privacyRiskScore(cohorts[1]), 89);
assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
assert.match(evaluateCohort(cohorts[0]).auditDigest, /^[a-f0-9]{64}$/);

console.log("reputation leaderboard cohort privacy guard tests passed");
