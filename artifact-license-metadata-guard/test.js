const assert = require("assert");
const { artifactBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const report = evaluateBatch(artifactBatch);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["release-ready"], 2);
assert.strictEqual(report.summary["hold-for-curation"], 2);

const model = report.artifacts.find((artifact) => artifact.id === "model-clinical-002");
assert(model.findings.some((finding) => finding.includes("not public-release compatible")));
assert(model.findings.some((finding) => finding.includes("missing checksum")));
assert(model.findings.some((finding) => finding.includes("sensitive artifact marked public")));

const supplement = report.artifacts.find((artifact) => artifact.id === "supplement-004");
assert(supplement.findings.some((finding) => finding.includes("CC0")));

console.log("artifact-license-metadata-guard tests passed");
