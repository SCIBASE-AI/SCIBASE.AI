'use strict';

const assert = require('assert/strict');
const { evaluateRepositoryRestoreRehearsals, digest } = require('./index');
const sample = require('./sample-data');

function evaluate(snapshots) {
  return evaluateRepositoryRestoreRehearsals({
    checkedAt: sample.checkedAt,
    snapshots,
  });
}

function testApprovesCleanSnapshot() {
  const result = evaluate(sample.cleanSnapshots);

  assert.equal(result.decision, 'restorable');
  assert.equal(result.summary.restorable, 1);
  assert.equal(result.releaseHold, false);
  assert.equal(result.snapshots[0].action, 'approve_restore');
}

function testNeedsReviewForSlowUnsignedFork() {
  const result = evaluate([sample.snapshots[1]]);

  assert.equal(result.decision, 'needs_review');
  assert.equal(result.summary.needsReview, 1);
  assert.ok(result.warnings.some((finding) => finding.code === 'restore_rto_exceeded'));
  assert.ok(result.warnings.some((finding) => finding.code === 'release_tag_unsigned'));
  assert.ok(result.warnings.some((finding) => finding.code === 'fork_lineage_unverified'));
}

function testQuarantinesHashAndLfsDrift() {
  const result = evaluate([sample.snapshots[2]]);

  assert.equal(result.decision, 'quarantined');
  assert.equal(result.releaseHold, true);
  assert.ok(result.blockers.some((finding) => finding.code === 'restore_hash_drift'));
  assert.ok(result.blockers.some((finding) => finding.code === 'lfs_object_unavailable'));
}

function testMarksUnrecoverableSnapshot() {
  const result = evaluate([sample.snapshots[3]]);

  assert.equal(result.decision, 'unrecoverable');
  assert.equal(result.summary.unrecoverable, 1);
  assert.ok(result.blockers.some((finding) => finding.code === 'restore_drill_failed'));
  assert.ok(result.blockers.some((finding) => finding.code === 'backup_key_escrow_missing'));
  assert.ok(result.blockers.some((finding) => finding.code === 'backup_retention_expired'));
}

function testCombinedSummary() {
  const result = evaluate(sample.snapshots);

  assert.equal(result.decision, 'unrecoverable');
  assert.equal(result.summary.totalSnapshots, 4);
  assert.equal(result.summary.restorable, 1);
  assert.equal(result.summary.needsReview, 1);
  assert.equal(result.summary.quarantined, 1);
  assert.equal(result.summary.unrecoverable, 1);
  assert.equal(result.releaseHold, true);
}

function testDigestIsDeterministic() {
  const input = {
    checkedAt: sample.checkedAt,
    snapshots: sample.snapshots,
  };
  const first = evaluateRepositoryRestoreRehearsals(input);
  const second = evaluateRepositoryRestoreRehearsals(input);

  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ y: 1, a: 2 }), digest({ a: 2, y: 1 }));
}

function run() {
  testApprovesCleanSnapshot();
  testNeedsReviewForSlowUnsignedFork();
  testQuarantinesHashAndLfsDrift();
  testMarksUnrecoverableSnapshot();
  testCombinedSummary();
  testDigestIsDeterministic();
  console.log('repository-restore-rehearsal-guard tests passed');
}

run();
