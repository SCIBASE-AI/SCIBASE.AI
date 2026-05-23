const assert = require('node:assert/strict');
const {analyzeReleasePacket} = require('./index');

const basePacket = {
  challengeId: 'CH-BIO-EMBARGO-042',
  title: 'Single-cell biomarker challenge',
  releaseDate: '2026-06-15',
  visibility: 'public',
  sponsor: {
    name: 'Northstar Therapeutics',
    approval: {approved: true, approvedBy: 'sponsor-director', approvedAt: '2026-06-10'},
  },
  award: {
    winnerAnnouncement: true,
    winners: [
      {teamId: 'team-atlas', consentToPublicName: true, notifiedAt: '2026-06-11'},
      {teamId: 'team-orbit', consentToPublicName: true, notifiedAt: '2026-06-11'},
    ],
  },
  embargoes: [
    {id: 'embargo-1', type: 'sponsor-review', endsAt: '2026-06-10', releaseApproved: true},
  ],
  patentHolds: [
    {id: 'patent-1', status: 'cleared', docketId: 'US-2026-88421', counselApprovedAt: '2026-06-09'},
  ],
  publicationHolds: [
    {id: 'pub-1', status: 'cleared', manuscriptId: 'BIO-2026-119', clearedAt: '2026-06-08'},
  ],
  ndaRelease: {
    required: true,
    sponsorApproved: true,
    solverApprovals: [
      {teamId: 'team-atlas', approved: true},
      {teamId: 'team-orbit', approved: true},
    ],
  },
  funderPolicy: {
    openScienceDeadline: '2026-06-30',
    exceptionApproved: false,
  },
  artifacts: [
    {
      id: 'winner-summary',
      type: 'winner-announcement',
      visibility: 'public',
      redaction: 'complete',
      checksum: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      license: 'CC-BY-4.0',
    },
    {
      id: 'notebook-bundle',
      type: 'notebook',
      visibility: 'public',
      redaction: 'complete',
      checksum: 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      license: 'MIT',
    },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test('holds release packets while active embargoes and patent holds remain unresolved', () => {
  const packet = clone(basePacket);
  packet.embargoes[0] = {id: 'embargo-1', type: 'sponsor-review', endsAt: '2026-07-01', releaseApproved: false};
  packet.patentHolds[0] = {id: 'patent-1', status: 'pending', docketId: '', counselApprovedAt: ''};

  const result = analyzeReleasePacket(packet);

  assert.equal(result.status, 'hold');
  assert(result.blockers.some((item) => item.code === 'ACTIVE_EMBARGO'));
  assert(result.blockers.some((item) => item.code === 'PATENT_HOLD_UNCLEARED'));
  assert.equal(result.summary.releaseReady, false);
});

test('blocks public release when NDA approvals or solver public-name consent are missing', () => {
  const packet = clone(basePacket);
  packet.ndaRelease.solverApprovals[1].approved = false;
  packet.award.winners[1].consentToPublicName = false;

  const result = analyzeReleasePacket(packet);

  assert.equal(result.status, 'hold');
  assert(result.blockers.some((item) => item.code === 'NDA_RELEASE_APPROVAL_MISSING'));
  assert(result.blockers.some((item) => item.code === 'WINNER_PUBLIC_CONSENT_MISSING'));
});

test('holds unsafe artifacts until checksums, licenses, and redaction are complete', () => {
  const packet = clone(basePacket);
  packet.artifacts.push({
    id: 'private-holdout',
    type: 'dataset',
    visibility: 'public',
    redaction: 'partial',
    checksum: 'sha256:not-a-real-digest',
    license: '',
  });

  const result = analyzeReleasePacket(packet);
  const artifact = result.artifactDecisions.find((item) => item.id === 'private-holdout');

  assert.equal(result.status, 'hold');
  assert.equal(artifact.decision, 'hold');
  assert(artifact.reasons.includes('REDACTION_INCOMPLETE'));
  assert(artifact.reasons.includes('CHECKSUM_INVALID'));
  assert(artifact.reasons.includes('LICENSE_MISSING'));
});

test('warns when funder open-science deadline is near but allows clean release', () => {
  const packet = clone(basePacket);
  packet.releaseDate = '2026-06-28';

  const result = analyzeReleasePacket(packet);

  assert.equal(result.status, 'release_ready');
  assert(result.warnings.some((item) => item.code === 'FUNDER_DEADLINE_NEAR'));
  assert.equal(result.summary.releaseReady, true);
});

test('returns deterministic reviewer digest for identical release packets', () => {
  const first = analyzeReleasePacket(clone(basePacket));
  const second = analyzeReleasePacket(clone(basePacket));

  assert.equal(first.status, 'release_ready');
  assert.match(first.digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.digest, second.digest);
});
