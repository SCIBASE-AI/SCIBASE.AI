const assert = require("assert");

const { assessAccessibilityLocalization, normalizeChallenge } = require("./index");
const { accessibleChallenge, riskyChallenge } = require("./sample-data");

const clean = assessAccessibilityLocalization(accessibleChallenge);
assert.strictEqual(clean.decision, "release");
assert.strictEqual(clean.summary.findings, 0);

const risky = assessAccessibilityLocalization(riskyChallenge);
assert.strictEqual(risky.decision, "hold");
for (const code of [
  "MISSING_REQUIRED_LANGUAGE",
  "STALE_TRANSLATION_DIGEST",
  "ACCESSIBILITY_FORMAT_GAP",
  "VIDEO_CAPTION_TRANSCRIPT_GAP",
  "TIMEZONE_DISPLAY_GAP",
  "FORM_LANGUAGE_GAP",
  "FORM_ACCESSIBILITY_GAP",
]) {
  assert(risky.findings.some((finding) => finding.code === code), `missing ${code}`);
}

const partial = assessAccessibilityLocalization({
  ...accessibleChallenge,
  deadlines: [{ id: "final", timestamp: "2026-07-10T17:00:00Z", displayTimezones: ["UTC"] }],
});
assert.strictEqual(partial.decision, "revise");
assert(partial.findings.some((finding) => finding.code === "TIMEZONE_DISPLAY_GAP"));

assert.throws(
  () => normalizeChallenge({ ...accessibleChallenge, challengeId: "" }),
  /challengeId must be a non-empty string/
);

console.log("challenge accessibility localization guard tests passed");
