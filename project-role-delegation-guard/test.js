const assert = require('assert');
const {
  evaluateDelegationRequests,
  buildDelegationReviewPacket,
} = require('./index');
const { sampleWorkspace, compliantWorkspace } = require('./sample-data');

function testSensitiveDelegationsAreHeld() {
  const review = evaluateDelegationRequests(sampleWorkspace, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.equal(review.overallStatus, 'hold');
  assert.equal(review.summary.blockingHolds, 4);
  assert.ok(review.holds.some((hold) => hold.code === 'missing_sponsor_approval'));
  assert.ok(review.holds.some((hold) => hold.code === 'identity_posture_gap'));
  assert.ok(review.holds.some((hold) => hold.code === 'separation_of_duties_violation'));
  assert.ok(review.holds.some((hold) => hold.code === 'delegated_scope_exceeds_action'));
  assert.equal(review.decisions.find((decision) => decision.requestId === 'del-export-7').decision, 'block');
  assert.equal(review.decisions.find((decision) => decision.requestId === 'del-publish-2').decision, 'needs_sponsor');
}

function testReviewPacketIsDeterministic() {
  const packet = buildDelegationReviewPacket(sampleWorkspace, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    packet.holds.map((hold) => hold.code),
    [
      'delegated_scope_exceeds_action',
      'identity_posture_gap',
      'missing_sponsor_approval',
      'separation_of_duties_violation',
    ],
  );
  assert.equal(packet.approvalChecklist.length, 4);
  assert.ok(packet.approvalChecklist.every((item) => item.requestId && item.requiredAction));
}

function testCompliantDelegationsPassWithExpiryWarning() {
  const review = evaluateDelegationRequests(compliantWorkspace, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.equal(review.overallStatus, 'ready');
  assert.equal(review.summary.blockingHolds, 0);
  assert.equal(review.warnings.length, 1);
  assert.equal(review.warnings[0].code, 'delegation_near_expiry');
}

testSensitiveDelegationsAreHeld();
testReviewPacketIsDeterministic();
testCompliantDelegationsPassWithExpiryWarning();

console.log('project-role-delegation-guard tests passed');
