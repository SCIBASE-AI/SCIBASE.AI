const assert = require("node:assert/strict");
const data = require("./sample-data");
const { compareSubmissions, digest, renderMarkdown, renderSvg, runFreezeGate } = require("./index");

const report = runFreezeGate(data);

assert.equal(report.module, "challenge-evidence-freeze-gate");
assert.equal(report.summary.releaseDecision, "hold-evaluation-and-payout");
assert.equal(report.summary.blockerCount, 4);
assert.ok(report.auditDigest.match(/^[a-f0-9]{64}$/));

assert.ok(report.diffs.some((diff) => diff.code === "checksum-drift" && diff.artifactId === "model"));
assert.ok(report.diffs.some((diff) => diff.code === "metric-drift" && diff.artifactId === "model"));
assert.ok(report.diffs.some((diff) => diff.code === "primary-artifact-added-after-deadline" && diff.artifactId === "supplement"));
assert.ok(report.diffs.some((diff) => diff.code === "exception-justification-missing" && diff.artifactId === "supplement"));
assert.ok(report.diffs.some((diff) => diff.code === "metadata-size-drift" && diff.artifactId === "whitepaper"));

assert.ok(report.arbitrationPacket.excludedFromScoring.includes("model"));
assert.ok(report.arbitrationPacket.excludedFromScoring.includes("supplement"));
assert.ok(report.arbitrationPacket.publicExceptionNotes.some((note) => note.artifactId === "model"));

const cleanCurrent = {
  ...data.currentSubmission,
  manifestHash: data.frozenSubmission.manifestHash,
  artifacts: data.frozenSubmission.artifacts
};
assert.deepEqual(compareSubmissions(data.challenge, data.frozenSubmission, cleanCurrent), []);

assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
assert.ok(renderMarkdown(report).includes("Challenge Evidence Freeze Review"));
assert.ok(renderSvg(report).startsWith("<svg"));

console.log("Challenge evidence freeze gate tests passed");
