const assert = require("assert");
const {
  auditProjectRepository,
  digest,
  hashContent,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { auditPolicy, readyProject, riskyProject } = require("./sample-data");

const risky = auditProjectRepository(riskyProject, auditPolicy);
assert.strictEqual(risky.decision, "block-project-release");
assert.ok(risky.riskScore >= 90, "risky repository should produce a strong block score");
assert.ok(risky.findings.some((item) => item.code === "REQUIRED_REPOSITORY_AREA_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "CONTENT_HASH_MISMATCH"));
assert.ok(risky.findings.some((item) => item.code === "LARGE_FILE_NOT_IN_LFS"));
assert.ok(risky.findings.some((item) => item.code === "PUBLIC_RELEASE_WITHOUT_DOI"));
assert.ok(risky.findings.some((item) => item.code === "SEMVER_TAG_INVALID"));
assert.ok(risky.findings.some((item) => item.code === "VERSION_HISTORY_INCOMPLETE"));
assert.ok(risky.findings.some((item) => item.code === "FORK_ATTRIBUTION_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "MERGE_REQUEST_REVIEW_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "REPRODUCIBILITY_RUN_FAILED"));

const repeat = auditProjectRepository(riskyProject, auditPolicy);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const ready = auditProjectRepository(readyProject, auditPolicy);
assert.strictEqual(ready.decision, "ready-for-version-tag");
assert.strictEqual(ready.findings.length, 0);
assert.strictEqual(ready.areasPresent.length, 7);

assert.strictEqual(hashContent("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Repository Integrity Audit"));
assert.ok(markdown.includes("Synthetic project repository manifest only"));
assert.ok(markdown.includes("block-project-release"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Repository Integrity Audit"));

console.log("repository-integrity-auditor tests passed");
