const assert = require("node:assert/strict");
const { evaluateStylePackage, sha256 } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateStylePackage(cleanPacket);
assert.equal(clean.summary.decision, "release_enterprise_style_exports");
assert.equal(clean.summary.findingCount, 0);
assert.equal(clean.summary.stylePackagesReviewed, 1);
assert.ok(clean.summary.auditDigest.startsWith("sha256:"));

const risky = evaluateStylePackage(riskyPacket);
assert.equal(risky.summary.decision, "hold_enterprise_style_exports");
assert.equal(risky.summary.stylePackagesReviewed, 2);
assert.ok(risky.summary.findingCount >= 10);
assert.ok(risky.summary.highOrCriticalFindings >= 7);

const findingCodes = new Set(risky.findings.map((finding) => finding.code));
assert.ok(findingCodes.has("TEMPLATE_CHECKSUM_DRIFT"));
assert.ok(findingCodes.has("PRIVATE_FIELD_EXPORTED_IN_STYLE_PREVIEW"));
assert.ok(findingCodes.has("PLUGIN_NOT_APPROVED"));
assert.ok(findingCodes.has("PLUGIN_VERSION_NOT_PINNED"));
assert.ok(findingCodes.has("EXPORT_METADATA_PRESERVATION_GAP"));
assert.ok(findingCodes.has("CITATION_STYLE_MISMATCH"));
assert.ok(findingCodes.has("EXPORT_FORMAT_COVERAGE_GAP"));

const firstDigest = evaluateStylePackage(riskyPacket).summary.auditDigest;
const secondDigest = evaluateStylePackage(riskyPacket).summary.auditDigest;
assert.equal(firstDigest, secondDigest);
assert.equal(sha256({ b: 2, a: 1 }), sha256({ a: 1, b: 2 }));

console.log("enterprise style package provenance guard tests passed");
