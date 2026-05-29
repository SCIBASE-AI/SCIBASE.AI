const assert = require("assert");
const { reputationBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const report = evaluateBatch(reputationBatch);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["count-reputation-credit"], 2);
assert.strictEqual(report.summary["hold-reputation-credit"], 2);

const conflict = report.reviews.find((review) => review.id === "review-102");
assert(conflict.findings.some((finding) => finding.includes("shares affiliation")));
assert(conflict.findings.some((finding) => finding.includes("reciprocal")));
assert(conflict.actions.includes("suppress leaderboard update"));

const anonymous = report.reviews.find((review) => review.id === "review-103");
assert(anonymous.findings.some((finding) => finding.includes("identity leakage")));
assert.strictEqual(anonymous.decision, "hold-reputation-credit");

console.log("reputation-review-abuse-guard tests passed");
