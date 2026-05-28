"use strict";

const assert = require("assert");
const {
  auditForkProvenance,
  renderMarkdownReport,
  computeManifestHash,
  isLicenseCompatible,
} = require("./index");
const { derivedRepository } = require("./sample-data");

assert.strictEqual(isLicenseCompatible("MIT", "Apache-2.0"), true);
assert.strictEqual(isLicenseCompatible("CC-BY-4.0", "proprietary"), false);
assert.strictEqual(computeManifestHash([{ path: "b", sha256: "2" }, { path: "a", sha256: "1" }]).length, 16);

const report = auditForkProvenance(derivedRepository);
const codes = new Set(report.findings.map((finding) => finding.code));

assert.strictEqual(report.summary.decision, "hold-publication-export");
assert.strictEqual(report.summary.riskScore, 100);
assert.ok(codes.has("ATTRIBUTION_DROPPED"), "missing attribution drop detection");
assert.ok(codes.has("MERGE_BASE_AMBIGUOUS"), "missing merge base detection");
assert.ok(codes.has("UNREVIEWED_PROVENANCE_REWRITE"), "missing history rewrite review detection");
assert.ok(codes.has("DOI_VERSION_DRIFT"), "missing DOI/tag drift detection");
assert.ok(codes.has("EXPORT_MANIFEST_HASH_MISMATCH"), "missing export manifest hash detection");
assert.ok(codes.has("DERIVATION_LICENSE_CONFLICT"), "missing license conflict detection");
assert.ok(codes.has("CITATION_BADGE_STALE"), "missing citation badge drift detection");

const repeat = auditForkProvenance(derivedRepository);
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "digest should be stable");

const markdown = renderMarkdownReport(report);
assert.ok(markdown.includes("Fork Provenance Attribution Audit"));
assert.ok(markdown.includes("hold-publication-export"));
assert.ok(markdown.includes(report.summary.auditDigest));

console.log("fork-provenance-attribution-auditor tests passed");
