const assert = require("assert");
const { releases } = require("./sample-data");
const { reviewReleases, signatureIsExpired } = require("./index");

function byId(report, id) {
  return report.results.find((result) => result.releaseId === id);
}

function runTests() {
  assert.strictEqual(signatureIsExpired({ expiresAt: "2027-01-01T00:00:00Z" }), false);
  assert.strictEqual(signatureIsExpired({ expiresAt: "2026-01-01T00:00:00Z" }), true);

  const report = reviewReleases(releases);
  assert.strictEqual(report.summary.releaseCount, 4);

  const clean = byId(report, "rel-clean-preprint-v2");
  assert.strictEqual(clean.decision, "publish");
  assert.strictEqual(clean.signatureScore, 100);

  const unsigned = byId(report, "rel-unsigned-tag");
  assert.strictEqual(unsigned.decision, "hold-release");
  assert.ok(unsigned.issues.some((issue) => issue.code === "missing-tag-signature"));

  const drift = byId(report, "rel-attestation-drift");
  assert.strictEqual(drift.decision, "hold-release");
  assert.ok(drift.issues.some((issue) => issue.code === "citation-target-drift"));
  assert.ok(drift.issues.some((issue) => issue.code === "attestation-manifest-drift"));
  assert.ok(drift.issues.some((issue) => issue.code === "component-not-attested"));

  const expired = byId(report, "rel-expired-untrusted-signer");
  assert.strictEqual(expired.decision, "hold-release");
  assert.ok(expired.issues.some((issue) => issue.code === "untrusted-tag-signer"));
  assert.ok(expired.issues.some((issue) => issue.code === "expired-tag-signature"));
  assert.ok(expired.issues.some((issue) => issue.code === "missing-release-attestation"));

  console.log("repository release signature guard tests passed");
}

runTests();
