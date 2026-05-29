const assert = require("assert");
const { releaseBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const report = evaluateBatch(releaseBatch);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["release-ready"], 2);
assert.strictEqual(report.summary["hold-release"], 2);

const active = report.assets.find((asset) => asset.id === "asset-2");
assert(active.findings.some((finding) => finding.includes("embargo active")));
assert(active.findings.some((finding) => finding.includes("public access")));

const stale = report.assets.find((asset) => asset.id === "asset-4");
assert(stale.findings.some((finding) => finding.includes("lacks public access")));
assert(stale.findings.some((finding) => finding.includes("DOI target")));
assert(stale.findings.some((finding) => finding.includes("citation badge")));

console.log("repository-embargo-release-guard tests passed");
