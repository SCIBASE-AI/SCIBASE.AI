"use strict";

const assert = require("assert");
const {
  evaluateSubmissionLicenseRisk,
  isPinnedVersion,
} = require("./index");
const {
  challengePolicy,
  riskySubmission,
  safeSubmission,
  conditionalSubmission,
} = require("./sample-data");

function codes(packet) {
  return new Set([...packet.blockers, ...packet.warnings].map((finding) => finding.code));
}

function testRiskySubmissionBlocksSponsorReview() {
  const packet = evaluateSubmissionLicenseRisk(challengePolicy, riskySubmission);
  const findingCodes = codes(packet);

  assert.strictEqual(packet.status, "block_sponsor_review");
  assert(packet.summary.blockers >= 8);
  assert(findingCodes.has("license_incompatible"));
  assert(findingCodes.has("dependency_advisory"));
  assert(findingCodes.has("dependency_unpinned"));
  assert(findingCodes.has("restricted_human_data"));
  assert(findingCodes.has("missing_consent"));
  assert(findingCodes.has("data_redistribution_blocked"));
  assert(findingCodes.has("model_commercial_use_blocked"));
  assert(findingCodes.has("export_disclosure_missing"));
  assert(packet.actions.every((action) => action.remediation.length > 0));
}

function testSafeSubmissionIsReviewReady() {
  const packet = evaluateSubmissionLicenseRisk(challengePolicy, safeSubmission);

  assert.strictEqual(packet.status, "review_ready");
  assert.strictEqual(packet.summary.blockers, 0);
  assert.strictEqual(packet.summary.warnings, 0);
  assert.strictEqual(packet.actions.length, 0);
}

function testConditionalSubmissionAllowsReviewWithNotices() {
  const packet = evaluateSubmissionLicenseRisk(challengePolicy, conditionalSubmission);
  const findingCodes = codes(packet);

  assert.strictEqual(packet.status, "conditional_review");
  assert.strictEqual(packet.summary.blockers, 0);
  assert(findingCodes.has("notice_missing"));
  assert(findingCodes.has("dependency_advisory"));
}

function testFingerprintIsDeterministic() {
  const first = evaluateSubmissionLicenseRisk(challengePolicy, riskySubmission);
  const second = evaluateSubmissionLicenseRisk(challengePolicy, riskySubmission);

  assert.strictEqual(first.fingerprint, second.fingerprint);
  assert.match(first.fingerprint, /^[a-f0-9]{64}$/);
}

function testPinnedVersionDetection() {
  assert.strictEqual(isPinnedVersion("1.2.3"), true);
  assert.strictEqual(isPinnedVersion("1.2.3-beta.1"), true);
  assert.strictEqual(isPinnedVersion("^1.2.3"), false);
  assert.strictEqual(isPinnedVersion("latest"), false);
}

function run() {
  testRiskySubmissionBlocksSponsorReview();
  testSafeSubmissionIsReviewReady();
  testConditionalSubmissionAllowsReviewWithNotices();
  testFingerprintIsDeterministic();
  testPinnedVersionDetection();
  console.log("5 tests passed");
}

run();
