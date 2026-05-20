const assert = require('assert');
const {
  evaluateRepositoryAccessReview,
  buildReleaseHoldPacket,
} = require('./index');
const { sampleRepository, readyRepository } = require('./sample-data');

function testReleaseHoldSignals() {
  const review = evaluateRepositoryAccessReview(sampleRepository, {
    asOf: '2026-05-20T12:00:00Z',
    releaseTag: 'v2.1.0',
  });

  assert.equal(review.releaseStatus, 'hold');
  assert.equal(review.summary.blockingHolds, 5);
  assert.ok(review.holds.some((hold) => hold.code === 'external_reviewer_expired'));
  assert.ok(review.holds.some((hold) => hold.code === 'restricted_dataset_approval_expired'));
  assert.ok(review.holds.some((hold) => hold.code === 'privileged_role_without_release_scope'));
  assert.ok(review.holds.some((hold) => hold.code === 'secret_link_exposure'));
  assert.ok(review.holds.some((hold) => hold.code === 'license_access_mismatch'));
  assert.equal(review.accessMatrix.find((entry) => entry.userId === 'u-ext-17').decision, 'revoke_before_release');
  assert.equal(review.accessMatrix.find((entry) => entry.userId === 'u-admin-2').decision, 'downgrade_before_release');
}

function testReleasePacketIsDeterministicAndReviewReady() {
  const packet = buildReleaseHoldPacket(sampleRepository, {
    asOf: '2026-05-20T12:00:00Z',
    releaseTag: 'v2.1.0',
  });

  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    packet.releaseHolds.map((hold) => hold.code),
    [
      'external_reviewer_expired',
      'license_access_mismatch',
      'privileged_role_without_release_scope',
      'restricted_dataset_approval_expired',
      'secret_link_exposure',
    ],
  );
  assert.equal(packet.reviewerChecklist.length, 5);
  assert.ok(packet.reviewerChecklist.every((item) => item.owner && item.requiredAction));
}

function testReadyRepositoryPassesWithAuditableWarnings() {
  const review = evaluateRepositoryAccessReview(readyRepository, {
    asOf: '2026-05-20T12:00:00Z',
    releaseTag: 'v1.4.2',
  });

  assert.equal(review.releaseStatus, 'ready');
  assert.equal(review.summary.blockingHolds, 0);
  assert.equal(review.summary.warningCount, 1);
  assert.equal(review.warnings[0].code, 'temporary_access_near_expiry');
}

testReleaseHoldSignals();
testReleasePacketIsDeterministicAndReviewReady();
testReadyRepositoryPassesWithAuditableWarnings();

console.log('repository-access-review-gate tests passed');
