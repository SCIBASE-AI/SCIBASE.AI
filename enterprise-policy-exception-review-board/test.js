const assert = require('assert');
const {
  evaluatePolicyExceptions,
  buildPolicyExceptionPacket,
} = require('./index');
const { sampleInstitution, compliantInstitution } = require('./sample-data');

function testEnterpriseExceptionsNeedGovernance() {
  const review = evaluatePolicyExceptions(sampleInstitution, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.equal(review.overallStatus, 'review_required');
  assert.equal(review.summary.blockingFindings, 4);
  assert.ok(review.findings.some((finding) => finding.code === 'missing_required_approval'));
  assert.ok(review.findings.some((finding) => finding.code === 'expired_exception'));
  assert.ok(review.findings.some((finding) => finding.code === 'compensating_control_gap'));
  assert.ok(review.findings.some((finding) => finding.code === 'owner_accountability_missing'));
  assert.equal(review.decisions.find((decision) => decision.exceptionId === 'exc-restricted-export').decision, 'block');
  assert.equal(review.decisions.find((decision) => decision.exceptionId === 'exc-api-schema').decision, 'expire');
}

function testPacketIncludesWebhookReadyEvents() {
  const packet = buildPolicyExceptionPacket(sampleInstitution, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
  assert.equal(packet.webhookEvents.length, 4);
  assert.ok(packet.webhookEvents.every((event) => event.signatureBase.includes(packet.institutionId)));
  assert.deepEqual(
    packet.findings.map((finding) => finding.code),
    [
      'compensating_control_gap',
      'expired_exception',
      'missing_required_approval',
      'owner_accountability_missing',
    ],
  );
}

function testCompliantExceptionBoardWarnsBeforeExpiry() {
  const review = evaluatePolicyExceptions(compliantInstitution, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.equal(review.overallStatus, 'ready');
  assert.equal(review.summary.blockingFindings, 0);
  assert.equal(review.warnings.length, 1);
  assert.equal(review.warnings[0].code, 'exception_near_expiry');
  assert.equal(review.decisions[0].decision, 'approve_with_controls');
}

testEnterpriseExceptionsNeedGovernance();
testPacketIncludesWebhookReadyEvents();
testCompliantExceptionBoardWarnsBeforeExpiry();

console.log('enterprise-policy-exception-review-board tests passed');
