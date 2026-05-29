const assert = require("assert");
const { suggestionBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const report = evaluateBatch(suggestionBatch);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["accept-or-display"], 2);
assert.strictEqual(report.summary["hold-suggestion"], 2);

const anonymousLeak = report.suggestions.find((item) => item.id === "sug-2");
assert(anonymousLeak.findings.some((finding) => finding.includes("exposes author identity")));

const stale = report.suggestions.find((item) => item.id === "sug-3");
assert(stale.findings.some((finding) => finding.includes("stale")));
assert(stale.findings.some((finding) => finding.includes("insufficient permission")));
assert(stale.findings.some((finding) => finding.includes("missing provenance")));

console.log("editor-suggestion-provenance-guard tests passed");
