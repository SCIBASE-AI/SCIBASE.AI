const assert = require("assert");
const { citationBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const report = evaluateBatch(citationBatch);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["insert-citation"], 2);
assert.strictEqual(report.summary["hold-citation"], 2);

const contradiction = report.recommendations.find((item) => item.id === "rec-2");
assert(contradiction.findings.some((finding) => finding.includes("contradicts context")));
assert(contradiction.findings.some((finding) => finding.includes("softened")));

const missingDoi = report.recommendations.find((item) => item.id === "rec-4");
assert(missingDoi.findings.some((finding) => finding.includes("missing DOI")));
assert(missingDoi.actions.includes("request closer supporting source"));

console.log("citation-context-fit-guard tests passed");
