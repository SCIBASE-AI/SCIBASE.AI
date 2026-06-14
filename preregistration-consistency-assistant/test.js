const assert = require("assert");
const studies = require("./sample-data.json");
const { evaluateStudies } = require("./index");

const results = evaluateStudies(studies);
const byId = Object.fromEntries(results.map((result) => [result.studyId, result]));

assert.strictEqual(byId["STUDY-01"].decision, "RELEASE_ASSISTANT_REVIEW");
assert.strictEqual(byId["STUDY-02"].decision, "FLAG_FOR_AUTHOR_CHECK");
assert.ok(byId["STUDY-02"].warnings.some((warning) => warning.includes("sample size")));
assert.strictEqual(byId["STUDY-03"].decision, "HOLD_ASSISTANT_REVIEW");
assert.ok(byId["STUDY-03"].blockers.some((blocker) => blocker.includes("preregistration")));
assert.ok(byId["STUDY-03"].blockers.some((blocker) => blocker.includes("subgroup")));

console.log("preregistration consistency assistant tests passed");
