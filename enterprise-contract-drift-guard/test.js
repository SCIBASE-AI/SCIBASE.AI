const assert = require("assert");
const { contracts } = require("./sample-data");
const { classifyChange, evaluateContracts } = require("./index");

assert.strictEqual(classifyChange("string", "string"), "compatible");
assert.strictEqual(classifyChange("string", "number"), "type-changed");
assert.strictEqual(classifyChange("string", undefined), "removed-field");
assert.strictEqual(classifyChange("enum:a|b", "enum:a|b|c"), "enum-expanded");
assert.strictEqual(classifyChange("enum:a|b", "enum:a"), "enum-narrowed");

const report = evaluateContracts(contracts);
assert.strictEqual(report.totalContracts, 4);
assert.strictEqual(report.releaseHolds, 3);
assert.strictEqual(report.stagedNotices, 0);
assert.strictEqual(report.approvals, 1);

const dspace = report.reports.find((entry) => entry.id === "dspace-repository-export");
assert(dspace.findings.some((finding) => finding.type === "missing-required-field"));

const canvas = report.reports.find((entry) => entry.id === "canvas-course-publication-webhook");
assert(canvas.findings.some((finding) => finding.type === "type-changed"));
assert(canvas.findings.some((finding) => finding.type === "short-deprecation-window"));

const eln = report.reports.find((entry) => entry.id === "eln-inventory-review-export");
assert(eln.findings.some((finding) => finding.type === "pii-redaction-disabled"));

console.log("enterprise-contract-drift-guard tests passed");
