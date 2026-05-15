const assert = require("assert");
const {evaluateScientificBounty, stableStringify} = require("./index");
const {challenge, reviews, submission} = require("./sample-data");

const result = evaluateScientificBounty(challenge, submission, reviews);

assert.strictEqual(result.payoutReadiness, "ready_for_sponsor_approval");
assert.strictEqual(result.ipTransferState, "eligible_after_payout");
assert.deepStrictEqual(result.missingDeliverables, []);
assert.deepStrictEqual(result.conflictReviewIds, ["review-conflicted"]);
assert.strictEqual(result.score.acceptedReviewCount, 2);
assert.strictEqual(result.score.passed, true);
assert.strictEqual(result.payoutPlan.length, 2);
assert.deepStrictEqual(result.payoutPlan[1].recipients, [
  {contributorId: "researcher-a", amountUsd: 420},
  {contributorId: "researcher-b", amountUsd: 280},
]);

const blockedSubmission = {
  ...submission,
  artifacts: submission.artifacts.filter((artifact) => artifact.type !== "notebook"),
};
const blocked = evaluateScientificBounty(challenge, blockedSubmission, reviews);

assert.strictEqual(blocked.payoutReadiness, "blocked");
assert.deepStrictEqual(blocked.missingDeliverables, ["notebook"]);
assert.strictEqual(blocked.payoutPlan.length, 0);
assert.ok(blocked.blockers.includes("missing_deliverables"));

const first = stableStringify({b: 2, a: 1});
const second = stableStringify({a: 1, b: 2});
assert.strictEqual(first, second);

console.log("scientific-bounty-review-integrity tests passed");
