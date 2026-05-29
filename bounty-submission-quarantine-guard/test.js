const assert = require("assert");
const { submissionBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const report = evaluateBatch(submissionBatch);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["release-to-review"], 2);
assert.strictEqual(report.summary["quarantine-submission"], 2);

const beta = report.submissions.find((item) => item.id === "sub-2");
assert(beta.findings.some((finding) => finding.includes("manifest")));
assert(beta.findings.some((finding) => finding.includes("sponsor visibility")));
assert(beta.findings.some((finding) => finding.includes("IP handoff")));

const gamma = report.submissions.find((item) => item.id === "sub-3");
assert(gamma.findings.some((finding) => finding.includes("missing hashes")));
assert(gamma.findings.some((finding) => finding.includes("executable-binary")));

console.log("bounty-submission-quarantine-guard tests passed");
