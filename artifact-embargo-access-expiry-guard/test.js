const assert = require('assert');

const {
  buildReleasePacket,
  reviewArtifactReleaseReadiness
} = require('./index');

const reviewDate = '2026-05-28';
const hostingProject = {
  id: 'data-hosting-14',
  title: 'Cryo-EM Artifact Release',
  reviewDate,
  artifacts: [
    {
      id: 'artifact-ready',
      type: 'dataset',
      embargoEndsOn: '2026-05-01',
      publicReleaseRequested: true,
      reviewerLinks: [{ id: 'rv-ready', expiresOn: '2026-06-15', revoked: false }],
      accessionEvidence: ['doi:10.0000/scibase.ready'],
      takedownRequest: false,
      legalHold: false,
      accessLog: 'alice@example.edu downloaded preview from 10.0.0.4'
    },
    {
      id: 'artifact-embargoed',
      type: 'model',
      embargoEndsOn: '2026-08-01',
      publicReleaseRequested: true,
      reviewerLinks: [{ id: 'rv-expired', expiresOn: '2026-04-15', revoked: false }],
      accessionEvidence: [],
      takedownRequest: false,
      legalHold: false,
      accessLog: 'token=artifact-secret bob@example.edu exported model'
    },
    {
      id: 'artifact-takedown',
      type: 'supplement',
      embargoEndsOn: '2026-01-01',
      publicReleaseRequested: true,
      reviewerLinks: [{ id: 'rv-revoked', expiresOn: '2026-06-15', revoked: true }],
      accessionEvidence: ['zenodo:12345'],
      takedownRequest: true,
      legalHold: true,
      accessLog: 'legal reviewer noted takedown'
    }
  ]
};

const result = reviewArtifactReleaseReadiness(hostingProject);

assert.strictEqual(result.readyCount, 1);
assert.strictEqual(result.holdCount, 2);
assert.ok(result.digest.startsWith('sha256:'));

const ready = result.artifactReviews.find((review) => review.artifactId === 'artifact-ready');
assert.strictEqual(ready.decision, 'ready');
assert.deepStrictEqual(ready.holds, []);
assert.strictEqual(ready.actions.releasePublicExport, true);

const embargoed = result.artifactReviews.find(
  (review) => review.artifactId === 'artifact-embargoed'
);
assert.strictEqual(embargoed.decision, 'hold');
assert.ok(embargoed.holds.includes('embargo-active'));
assert.ok(embargoed.holds.includes('reviewer-link-expired:rv-expired'));
assert.ok(embargoed.holds.includes('missing-accession-evidence'));
assert.strictEqual(embargoed.actions.releasePublicExport, false);

const takedown = result.artifactReviews.find(
  (review) => review.artifactId === 'artifact-takedown'
);
assert.strictEqual(takedown.decision, 'hold');
assert.ok(takedown.holds.includes('active-takedown-request'));
assert.ok(takedown.holds.includes('legal-hold-active'));
assert.ok(takedown.holds.includes('reviewer-link-revoked:rv-revoked'));

const packet = buildReleasePacket(hostingProject, result);
const serialized = JSON.stringify(packet);
assert.ok(!serialized.includes('alice@example.edu'));
assert.ok(!serialized.includes('bob@example.edu'));
assert.ok(!serialized.includes('artifact-secret'));
assert.deepStrictEqual(packet.summary, { ready: 1, hold: 2 });

console.log('artifact-embargo-access-expiry-guard tests passed');
