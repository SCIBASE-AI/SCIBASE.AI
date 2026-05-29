const assert = require("assert");
const { manuscript } = require("./sample-data");
const { evaluateManuscript } = require("./index");

const report = evaluateManuscript(manuscript);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary.supported, 1);
assert.strictEqual(report.summary.overclaimed, 1);
assert.strictEqual(report.summary["weakly-supported"], 2);

const supported = report.claims.find((claim) => claim.id === "claim-1");
assert.deepStrictEqual(supported.missingSignals, []);

const overclaim = report.claims.find((claim) => claim.id === "claim-2");
assert(overclaim.findings.some((finding) => finding.includes("stronger than the linked evidence")));
assert(overclaim.actions.includes("soften absolute wording"));

const safety = report.claims.find((claim) => claim.id === "claim-3");
assert(safety.missingSignals.includes("monitoring-window"));

const novelty = report.claims.find((claim) => claim.id === "claim-4");
assert(novelty.findings.some((finding) => finding.includes("scope limitation")));

console.log("manuscript-claim-evidence-alignment tests passed");
