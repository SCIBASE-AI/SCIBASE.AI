'use strict';

const assert = require('assert/strict');
const {
  evaluateRevenueEvidenceRetentionGuard,
  expectedEvidenceRoot,
  digest,
} = require('./index');
const sample = require('./sample-data');

function testReleasesCleanSubscriptionEvidence() {
  const result = evaluateRevenueEvidenceRetentionGuard(sample.cleanRegister);

  assert.equal(result.decision, 'release_revenue');
  assert.equal(result.summary.releaseRevenue, 1);
  assert.equal(result.summary.revenueAtRiskCents, 0);
  assert.equal(result.financeTasks[0], 'Release all revenue packets and archive evidence roots for audit sampling.');
}

function testReleaseWithControlsForLowReplicaEvidence() {
  const result = evaluateRevenueEvidenceRetentionGuard({
    checkedAt: sample.register.checkedAt,
    invoicePackets: [sample.lowReplicaSubscriptionPacket],
  });

  assert.equal(result.decision, 'release_with_controls');
  assert.equal(result.summary.releaseWithControls, 1);
  assert.ok(result.packets[0].warnings.some((finding) => finding.code === 'evidence_replica_count_low'));
}

function testHoldsComputeRevenueWithoutCostTraceAndRetention() {
  const result = evaluateRevenueEvidenceRetentionGuard({
    checkedAt: sample.register.checkedAt,
    invoicePackets: [sample.computePacketMissingCostTrace],
  });

  assert.equal(result.decision, 'hold_revenue');
  assert.equal(result.summary.revenueAtRiskCents, sample.computePacketMissingCostTrace.amountCents);
  assert.ok(result.packets[0].blockers.some((finding) => finding.code === 'required_evidence_missing'));
  assert.ok(result.packets[0].blockers.some((finding) => finding.code === 'retention_window_too_short'));
  assert.ok(result.packets[0].blockers.some((finding) => finding.code === 'immutability_lock_before_dispute_deadline'));
}

function testQuarantinesAnalyticsLicenseWithPrivateContent() {
  const result = evaluateRevenueEvidenceRetentionGuard({
    checkedAt: sample.register.checkedAt,
    invoicePackets: [sample.analyticsLicenseWithPrivateContent],
  });

  assert.equal(result.decision, 'quarantine_revenue');
  assert.ok(result.packets[0].blockers.some((finding) => finding.code === 'private_content_in_license_export'));
  assert.ok(result.packets[0].blockers.some((finding) => finding.code === 'privacy_review_not_approved'));
}

function testQuarantinesLegalHoldDeletionConflict() {
  const result = evaluateRevenueEvidenceRetentionGuard({
    checkedAt: sample.register.checkedAt,
    invoicePackets: [sample.legalHoldComputePacket],
  });

  assert.equal(result.decision, 'quarantine_revenue');
  assert.ok(result.packets[0].blockers.some((finding) => finding.code === 'legal_hold_deletion_conflict'));
}

function testEvidenceRootMismatchBlocksRevenue() {
  const tampered = {
    ...sample.cleanSubscriptionPacket,
    evidenceRoot: '0'.repeat(64),
  };
  const result = evaluateRevenueEvidenceRetentionGuard({
    checkedAt: sample.register.checkedAt,
    invoicePackets: [tampered],
  });

  assert.equal(result.decision, 'hold_revenue');
  assert.ok(result.packets[0].blockers.some((finding) => finding.code === 'evidence_root_mismatch'));
  assert.notEqual(expectedEvidenceRoot(tampered), tampered.evidenceRoot);
}

function testCombinedRegisterSummaryAndDigestAreDeterministic() {
  const first = evaluateRevenueEvidenceRetentionGuard(sample.register);
  const second = evaluateRevenueEvidenceRetentionGuard(sample.register);

  assert.equal(first.decision, 'quarantine_revenue');
  assert.equal(first.summary.totalPackets, 5);
  assert.equal(first.summary.releaseRevenue, 1);
  assert.equal(first.summary.releaseWithControls, 1);
  assert.equal(first.summary.holdRevenue, 1);
  assert.equal(first.summary.quarantineRevenue, 2);
  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
}

function run() {
  testReleasesCleanSubscriptionEvidence();
  testReleaseWithControlsForLowReplicaEvidence();
  testHoldsComputeRevenueWithoutCostTraceAndRetention();
  testQuarantinesAnalyticsLicenseWithPrivateContent();
  testQuarantinesLegalHoldDeletionConflict();
  testEvidenceRootMismatchBlocksRevenue();
  testCombinedRegisterSummaryAndDigestAreDeterministic();
  console.log('revenue-evidence-retention-guard tests passed');
}

run();
