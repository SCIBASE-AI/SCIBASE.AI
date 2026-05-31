const assert = require("assert");
const {
  evaluateEscrowReadiness,
  evaluateEscrowReadinessBatch,
  milestoneTotal,
  requiredCoverage,
} = require("./index");
const { challenges } = require("./sample-data");

const funded = challenges.find((item) => item.id === "challenge-funded-biomarker");
assert.strictEqual(requiredCoverage(funded), 138000);
assert.strictEqual(milestoneTotal(funded), 1);

const fundedDecision = evaluateEscrowReadiness(funded);
assert.strictEqual(fundedDecision.decision, "publish");
assert.strictEqual(fundedDecision.deficit, 0);
assert.ok(fundedDecision.actions.includes("publish funding-ready challenge"));

const underfunded = evaluateEscrowReadiness(
  challenges.find((item) => item.id === "challenge-underfunded-climate")
);
assert.strictEqual(underfunded.decision, "hold");
assert.ok(underfunded.deficit > 0);
assert.ok(underfunded.blockers.some((item) => item.includes("deposit is short")));
assert.ok(underfunded.blockers.some((item) => item.includes("refund lock")));

const invalidMilestones = evaluateEscrowReadiness(
  challenges.find((item) => item.id === "challenge-invalid-milestones")
);
assert.strictEqual(invalidMilestones.decision, "hold");
assert.ok(
  invalidMilestones.blockers.some((item) =>
    item.includes("milestone percentages sum")
  )
);

const report = evaluateEscrowReadinessBatch(challenges);
assert.deepStrictEqual(
  {
    total: report.summary.total,
    publish: report.summary.publish,
    publish_with_notice: report.summary.publish_with_notice,
    hold: report.summary.hold,
  },
  {
    total: 3,
    publish: 1,
    publish_with_notice: 0,
    hold: 2,
  }
);
assert.strictEqual(report.decisions[0].auditDigest.length, 64);

console.log("scientific bounty escrow readiness guard tests passed");
