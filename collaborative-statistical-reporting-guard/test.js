const assert = require("node:assert/strict");
const { evaluateStatisticalReporting, sha256 } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateStatisticalReporting(cleanPacket);
assert.equal(clean.summary.decision, "release_collaborative_export");
assert.equal(clean.summary.findingCount, 0);
assert.equal(clean.summary.analysesReviewed, 2);
assert.equal(clean.summary.heldAnalyses, 0);
assert.ok(clean.summary.auditDigest.startsWith("sha256:"));

const risky = evaluateStatisticalReporting(riskyPacket);
assert.equal(risky.summary.decision, "hold_collaborative_export");
assert.equal(risky.summary.analysesReviewed, 3);
assert.equal(risky.summary.heldAnalyses, 2);
assert.ok(risky.summary.findingCount >= 13);
assert.ok(risky.summary.criticalFindings >= 2);
assert.ok(risky.summary.highOrCriticalFindings >= 8);

const findingCodes = new Set(risky.findings.map((finding) => finding.code));
assert.ok(findingCodes.has("SAMPLE_SIZE_DRIFT"));
assert.ok(findingCodes.has("SAMPLE_SIZE_SOURCE_MISSING"));
assert.ok(findingCodes.has("P_VALUE_WORDING_CONTRADICTION"));
assert.ok(findingCodes.has("P_VALUE_TABLE_MISMATCH"));
assert.ok(findingCodes.has("EFFECT_SIZE_MISMATCH"));
assert.ok(findingCodes.has("EFFECT_SIZE_SOURCE_MISSING"));
assert.ok(findingCodes.has("CONFIDENCE_INTERVAL_MISMATCH"));
assert.ok(findingCodes.has("FIGURE_TEXT_STATISTIC_MISMATCH"));
assert.ok(findingCodes.has("FIGURE_STATISTIC_INCOMPLETE"));
assert.ok(findingCodes.has("LOCKED_SECTION_STAT_EDIT_UNAPPROVED"));
assert.ok(findingCodes.has("BLOCKING_STAT_REVIEW_COMMENT_OPEN"));
assert.ok(findingCodes.has("P_VALUE_MISSING"));

const firstDigest = evaluateStatisticalReporting(riskyPacket).summary.auditDigest;
const secondDigest = evaluateStatisticalReporting(riskyPacket).summary.auditDigest;
assert.equal(firstDigest, secondDigest);
assert.equal(sha256({ b: 2, a: 1 }), sha256({ a: 1, b: 2 }));

console.log("collaborative statistical reporting guard tests passed");
