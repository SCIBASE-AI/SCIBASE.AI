const assert = require("assert");
const records = require("./sample-data.json");
const { evaluateChargebacks } = require("./index");

const results = evaluateChargebacks(records);
const byId = Object.fromEntries(results.map((result) => [result.recordId, result]));

assert.strictEqual(byId["CB-1001"].decision, "APPROVE_CHARGEBACK");
assert.strictEqual(byId["CB-1001"].blockers.length, 0);

assert.strictEqual(byId["CB-1002"].decision, "ROUTE_FOR_APPROVAL");
assert.ok(byId["CB-1002"].warnings.some((warning) => warning.includes("overage approval")));
assert.ok(byId["CB-1002"].warnings.some((warning) => warning.includes("purchase order")));

assert.strictEqual(byId["CB-1003"].decision, "BLOCK_CHARGEBACK");
assert.ok(byId["CB-1003"].blockers.some((blocker) => blocker.includes("inactive cost center")));
assert.ok(byId["CB-1003"].blockers.some((blocker) => blocker.includes("data residency")));

console.log("enterprise cost center chargeback guard tests passed");
