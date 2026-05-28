const assert = require('assert');

const {
  buildSponsorPacket,
  reviewChallengeDataUseReadiness
} = require('./index');

function findReview(result, submissionId) {
  return result.submissionReviews.find((review) => review.submissionId === submissionId);
}

const challenge = {
  id: 'scibase-challenge-18',
  title: 'Single-cell Biomarker Challenge',
  controlledDatasets: [
    {
      id: 'ds-open-marker-table',
      tier: 'open',
      permittedUses: ['model-training', 'whitepaper'],
      retentionDays: 365
    },
    {
      id: 'ds-controlled-rna',
      tier: 'controlled',
      duaId: 'DUA-SCB-2026-44',
      permittedUses: ['model-training', 'whitepaper'],
      retentionDays: 30,
      exportControlled: false
    },
    {
      id: 'ds-export-assay',
      tier: 'restricted',
      duaId: 'DUA-SCB-2026-99',
      permittedUses: ['whitepaper'],
      retentionDays: 14,
      exportControlled: true
    }
  ],
  submissions: [
    {
      id: 'sub-ready',
      team: { id: 'team-alpha', contactEmail: 'alpha.lab@example.edu' },
      datasetUses: [
        { datasetId: 'ds-controlled-rna', use: 'model-training', daysHeld: 10 }
      ],
      agreements: [{ datasetId: 'ds-controlled-rna', duaId: 'DUA-SCB-2026-44', active: true }],
      exportClearances: [],
      artifacts: [{ name: 'model-card.md', containsControlledRows: false }],
      sponsorReviewRequested: true,
      payoutRequested: true,
      ipTransferRequested: true
    },
    {
      id: 'sub-missing-dua',
      team: { id: 'team-beta', contactEmail: 'beta.lab@example.edu' },
      datasetUses: [
        { datasetId: 'ds-controlled-rna', use: 'model-training', daysHeld: 4 }
      ],
      agreements: [],
      exportClearances: [],
      artifacts: [{ name: 'submission.zip', containsControlledRows: false }],
      sponsorReviewRequested: true,
      payoutRequested: true,
      ipTransferRequested: true
    },
    {
      id: 'sub-broad-release',
      team: { id: 'team-gamma', contactEmail: 'gamma.lab@example.edu' },
      datasetUses: [
        { datasetId: 'ds-controlled-rna', use: 'public-release', daysHeld: 6 }
      ],
      agreements: [{ datasetId: 'ds-controlled-rna', duaId: 'DUA-SCB-2026-44', active: true }],
      exportClearances: [],
      artifacts: [{ name: 'supplement.csv', containsControlledRows: true }],
      sponsorReviewRequested: true,
      payoutRequested: false,
      ipTransferRequested: false
    },
    {
      id: 'sub-export-gap',
      team: { id: 'team-delta', contactEmail: 'delta.lab@example.edu' },
      datasetUses: [
        { datasetId: 'ds-export-assay', use: 'whitepaper', daysHeld: 3 }
      ],
      agreements: [{ datasetId: 'ds-export-assay', duaId: 'DUA-SCB-2026-99', active: true }],
      exportClearances: [],
      artifacts: [{ name: 'whitepaper.pdf', containsControlledRows: false }],
      sponsorReviewRequested: true,
      payoutRequested: true,
      ipTransferRequested: false
    },
    {
      id: 'sub-retention-expired',
      team: { id: 'team-epsilon', contactEmail: 'epsilon.lab@example.edu' },
      datasetUses: [
        { datasetId: 'ds-controlled-rna', use: 'model-training', daysHeld: 46 }
      ],
      agreements: [{ datasetId: 'ds-controlled-rna', duaId: 'DUA-SCB-2026-44', active: true }],
      exportClearances: [],
      artifacts: [{ name: 'weights.bin', containsControlledRows: false }],
      sponsorReviewRequested: false,
      payoutRequested: true,
      ipTransferRequested: true
    }
  ]
};

const result = reviewChallengeDataUseReadiness(challenge);

assert.strictEqual(result.challengeId, challenge.id);
assert.strictEqual(result.submissionReviews.length, 5);
assert.match(result.auditDigest, /^sha256:[a-f0-9]{64}$/);

const ready = findReview(result, 'sub-ready');
assert.strictEqual(ready.decision, 'ready');
assert.deepStrictEqual(ready.holds, []);
assert.strictEqual(ready.releaseGates.sponsorReview, 'allow');
assert.strictEqual(ready.releaseGates.payout, 'allow');
assert.strictEqual(ready.releaseGates.ipTransfer, 'allow');

const missingDua = findReview(result, 'sub-missing-dua');
assert.strictEqual(missingDua.decision, 'hold');
assert.ok(missingDua.holds.includes('missing-active-dua:ds-controlled-rna'));
assert.strictEqual(missingDua.releaseGates.sponsorReview, 'hold');
assert.strictEqual(missingDua.releaseGates.payout, 'hold');
assert.strictEqual(missingDua.releaseGates.ipTransfer, 'hold');

const broadRelease = findReview(result, 'sub-broad-release');
assert.strictEqual(broadRelease.decision, 'hold');
assert.ok(broadRelease.holds.includes('use-not-permitted:ds-controlled-rna:public-release'));
assert.ok(broadRelease.holds.includes('controlled-rows-in-artifact:supplement.csv'));

const exportGap = findReview(result, 'sub-export-gap');
assert.strictEqual(exportGap.decision, 'manual-review');
assert.ok(exportGap.holds.includes('missing-export-clearance:ds-export-assay'));
assert.strictEqual(exportGap.releaseGates.payout, 'hold');

const retentionExpired = findReview(result, 'sub-retention-expired');
assert.strictEqual(retentionExpired.decision, 'hold');
assert.ok(retentionExpired.holds.includes('retention-window-expired:ds-controlled-rna'));
assert.ok(retentionExpired.remediation.some((item) => item.includes('return or destroy controlled data')));

const sponsorPacket = buildSponsorPacket(challenge, result);
const serialized = JSON.stringify(sponsorPacket);
assert.ok(!serialized.includes('alpha.lab@example.edu'));
assert.ok(!serialized.includes('beta.lab@example.edu'));
assert.ok(sponsorPacket.submissions.every((item) => item.teamContact === '[redacted]'));
assert.ok(sponsorPacket.submissions.some((item) => item.decision === 'manual-review'));

console.log('challenge-data-use-agreement-guard tests passed');
