const assert = require("assert");
const {
  digest,
  evaluateArtifactHosting,
  fileExtension,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { hostingPolicy, readyBundle, riskyBundle } = require("./sample-data");

const risky = evaluateArtifactHosting(riskyBundle, hostingPolicy);
assert.strictEqual(risky.decision, "block-artifact-publication");
assert.ok(risky.riskScore >= 90, "risky bundle should produce a strong block score");
assert.ok(risky.findings.some((item) => item.code === "ARTIFACT_DIGEST_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "ARTIFACT_EXCEEDS_STORAGE_LIMIT"));
assert.ok(risky.findings.some((item) => item.code === "UNSUPPORTED_ARTIFACT_TYPE"));
assert.ok(risky.findings.some((item) => item.code === "PERSISTENT_IDENTIFIER_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "REUSE_LICENSE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "RESTRICTED_DATA_PUBLIC"));
assert.ok(risky.findings.some((item) => item.code === "EXECUTION_SANDBOX_DISABLED"));
assert.ok(risky.findings.some((item) => item.code === "REPRODUCIBILITY_TRIGGER_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "ARTIFACT_VERSION_INVALID"));

const repeat = evaluateArtifactHosting(riskyBundle, hostingPolicy);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const ready = evaluateArtifactHosting(readyBundle, hostingPolicy);
assert.strictEqual(ready.decision, "ready-for-hosting");
assert.strictEqual(ready.findings.length, 0);
assert.strictEqual(ready.runtimeMode, "container");

assert.strictEqual(fileExtension("data/results.PARQUET"), "parquet");
assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Artifact Hosting Readiness"));
assert.ok(markdown.includes("Synthetic artifact bundle only"));
assert.ok(markdown.includes("block-artifact-publication"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Artifact Hosting Readiness"));

console.log("artifact-hosting-readiness tests passed");
