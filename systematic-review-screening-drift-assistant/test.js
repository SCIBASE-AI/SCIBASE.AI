const assert = require("node:assert/strict");
const { evaluateSystematicReviewScreening, sha256 } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateSystematicReviewScreening(cleanPacket);
assert.equal(clean.summary.decision, "release_systematic_review_assistant");
assert.equal(clean.summary.findingCount, 0);
assert.equal(clean.summary.studiesReviewed, 3);
assert.equal(clean.summary.gapPromptsReviewed, 1);
assert.ok(clean.summary.auditDigest.startsWith("sha256:"));
assert.equal(clean.gapPrompts[0].readyForRelease, true);

const risky = evaluateSystematicReviewScreening(riskyPacket);
assert.equal(risky.summary.decision, "hold_systematic_review_assistant");
assert.equal(risky.summary.studiesReviewed, 2);
assert.ok(risky.summary.findingCount >= 13);
assert.ok(risky.summary.criticalFindings >= 4);
assert.ok(risky.summary.highOrCriticalFindings >= 10);

const findingCodes = new Set(risky.findings.map((finding) => finding.code));
assert.ok(findingCodes.has("AI_POLICY_AUTHORITY_TOO_BROAD"));
assert.ok(findingCodes.has("AI_SCREENING_OVERRIDE_WITHOUT_APPROVAL"));
assert.ok(findingCodes.has("CRITERIA_VERSION_DRIFT"));
assert.ok(findingCodes.has("ELIGIBILITY_CRITERIA_INCOMPLETE"));
assert.ok(findingCodes.has("EXCLUSION_EVIDENCE_MISSING"));
assert.ok(findingCodes.has("EXCLUSION_REASON_NOT_IN_TAXONOMY"));
assert.ok(findingCodes.has("FULL_TEXT_DUAL_REVIEW_GAP"));
assert.ok(findingCodes.has("FULL_TEXT_RETRIEVAL_MISSING"));
assert.ok(findingCodes.has("PRIVATE_REVIEW_NOTE_EXPORTED"));
assert.ok(findingCodes.has("PRIVATE_REVIEW_NOTE_IN_GAP_PROMPT"));
assert.ok(findingCodes.has("UNRESOLVED_SCREENING_CONFLICT"));

const firstDigest = evaluateSystematicReviewScreening(riskyPacket).summary.auditDigest;
const secondDigest = evaluateSystematicReviewScreening(riskyPacket).summary.auditDigest;
assert.equal(firstDigest, secondDigest);
assert.equal(sha256({ b: 2, a: 1 }), sha256({ a: 1, b: 2 }));

console.log("systematic review screening drift assistant tests passed");
