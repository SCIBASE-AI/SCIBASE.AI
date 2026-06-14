const assert = require("assert");
const packets = require("./sample-data.json");
const { evaluateNotebooks } = require("./index");

const results = evaluateNotebooks(packets);
const byId = Object.fromEntries(results.map((result) => [result.notebookId, result]));

assert.strictEqual(byId["NB-100"].decision, "PUBLISH_REPRODUCIBLE");
assert.strictEqual(byId["NB-210"].decision, "REVIEW_BEFORE_RELEASE");
assert.ok(byId["NB-210"].warnings.some((warning) => warning.includes("slower")));
assert.strictEqual(byId["NB-404"].decision, "HOLD_RELEASE");
assert.ok(byId["NB-404"].blockers.some((blocker) => blocker.includes("output digest")));
assert.ok(byId["NB-404"].blockers.some((blocker) => blocker.includes("random seed")));

console.log("notebook rerun determinism guard tests passed");
