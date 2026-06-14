const assert = require("assert");
const challenges = require("./sample-data.json");
const { evaluatePortfolio } = require("./index");

const results = evaluatePortfolio(challenges);
const byId = Object.fromEntries(results.map((result) => [result.challengeId, result]));

assert.strictEqual(byId["BIO-42"].decision, "ASSIGN_PANEL");
assert.deepStrictEqual(byId["BIO-42"].eligibleReviewers, ["r-ada", "r-lin"]);

assert.strictEqual(byId["MAT-11"].decision, "HOLD_ASSIGNMENT");
assert.ok(byId["MAT-11"].blockers.some((blocker) => blocker.includes("conflicts")));
assert.ok(byId["MAT-11"].blockers.some((blocker) => blocker.includes("overloaded")));

assert.strictEqual(byId["QNT-7"].decision, "HOLD_ASSIGNMENT");
assert.deepStrictEqual(byId["QNT-7"].missingExpertise, ["quantum", "signal-processing"]);

console.log("scientific bounty reviewer capacity guard tests passed");
