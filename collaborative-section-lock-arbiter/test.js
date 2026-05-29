const assert = require("assert");
const { now, sections } = require("./sample-data");
const { evaluateLocks } = require("./index");

const report = evaluateLocks(sections, now);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["block-conflicting-edit"], 1);
assert.strictEqual(report.summary["release-stale-lock"], 1);
assert.strictEqual(report.summary["allow-reviewed-override"], 1);
assert.strictEqual(report.summary["allow-edit"], 1);

const figure = report.decisions.find((item) => item.id === "fig-3-final");
assert(figure.findings.some((finding) => finding.includes("freeze window active")));
assert(figure.findings.some((finding) => finding.includes("pending suggestions")));

const dataset = report.decisions.find((item) => item.id === "dataset-table-raw");
assert(dataset.actions.includes("release stale lock"));

const protocol = report.decisions.find((item) => item.id === "protocol-sampling");
assert(protocol.actions.includes("record reviewer override"));

console.log("collaborative-section-lock-arbiter tests passed");
