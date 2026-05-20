const assert = require('assert');
const {
  evaluateArtifactRetention,
  buildTombstoneLedgerPacket,
} = require('./index');
const { sampleHostingProject, disposalReadyProject } = require('./sample-data');

function testRetentionAndHoldBlockers() {
  const review = evaluateArtifactRetention(sampleHostingProject, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.equal(review.overallStatus, 'hold');
  assert.equal(review.summary.blockingHolds, 5);
  assert.ok(review.holds.some((hold) => hold.code === 'active_policy_hold'));
  assert.ok(review.holds.some((hold) => hold.code === 'retention_window_not_elapsed'));
  assert.ok(review.holds.some((hold) => hold.code === 'checksum_manifest_missing'));
  assert.ok(review.holds.some((hold) => hold.code === 'citation_tombstone_required'));
  assert.ok(review.holds.some((hold) => hold.code === 'destructive_delete_not_allowed'));
  assert.equal(review.decisions.find((decision) => decision.artifactId === 'raw-trials-2024').decision, 'hold');
  assert.equal(review.decisions.find((decision) => decision.artifactId === 'derived-public-csv').decision, 'tombstone_required');
}

function testLedgerPacketPreservesAuditEvidence() {
  const packet = buildTombstoneLedgerPacket(sampleHostingProject, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
  assert.equal(packet.tombstonePlan.length, 4);
  assert.ok(packet.tombstonePlan.some((item) => item.artifactId === 'derived-public-csv' && item.requiredMetadata.doi));
  assert.deepEqual(
    packet.holds.map((hold) => hold.code),
    [
      'active_policy_hold',
      'checksum_manifest_missing',
      'citation_tombstone_required',
      'destructive_delete_not_allowed',
      'retention_window_not_elapsed',
    ],
  );
}

function testEligibleDisposalProducesTombstonePacket() {
  const review = evaluateArtifactRetention(disposalReadyProject, {
    asOf: '2026-05-20T12:00:00Z',
  });

  assert.equal(review.overallStatus, 'ready');
  assert.equal(review.summary.blockingHolds, 0);
  assert.equal(review.decisions[0].decision, 'dispose_with_tombstone');
  assert.equal(review.decisions[0].tombstoneRequired, true);
}

testRetentionAndHoldBlockers();
testLedgerPacketPreservesAuditEvidence();
testEligibleDisposalProducesTombstonePacket();

console.log('artifact-retention-tombstone-ledger tests passed');
