'use strict';

const challenge = {
  id: 'sci-benchmark-alpha',
  title: 'Open Materials Yield Prediction Challenge',
  metric: {
    name: 'holdout_accuracy',
    direction: 'maximize',
    tolerance: 0.00001,
  },
  rules: {
    maxSubmissionsPerTeam: 3,
    resubmissionWindowHours: 24,
    blindedHoldoutRequired: true,
    requireTieBreakers: true,
    requirePackageHash: true,
  },
  benchmarkPackage: {
    sha256: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    builtAt: '2026-05-19T00:00:00.000Z',
    artifact: 's3://scibase-challenges/materials-alpha/eval-package.tar.zst',
  },
  holdout: {
    publiclyReleased: false,
    rows: 5000,
    saltRotationId: 'rotation-2026-05',
  },
  tieBreakers: [
    'lower inference latency on blinded holdout',
    'earlier valid submission timestamp',
  ],
};

const submissions = [
  {
    id: 'sub-valid-001',
    teamId: 'team-mendeleev',
    submittedAt: '2026-05-18T13:00:00.000Z',
    metrics: {
      holdout_accuracy: 0.96,
    },
    recomputedScore: 0.96,
    packageSha256: challenge.benchmarkPackage.sha256,
    datasetAccess: {
      holdoutRowsViewed: 0,
      holdoutDownloaded: false,
    },
    leakageScore: 0.08,
    auditTrail: [
      'ingested:2026-05-18T13:01:00.000Z',
      'scored:2026-05-18T13:04:00.000Z',
      'published-private:2026-05-18T13:05:00.000Z',
    ],
  },
  {
    id: 'sub-review-002',
    teamId: 'team-curie',
    submittedAt: '2026-05-18T15:00:00.000Z',
    metrics: {
      holdout_accuracy: 0.94,
    },
    recomputedScore: 0.94,
    packageSha256: challenge.benchmarkPackage.sha256,
    datasetAccess: {
      holdoutRowsViewed: 0,
      holdoutDownloaded: false,
    },
    leakageScore: 0.14,
    auditTrail: [],
  },
  {
    id: 'sub-block-003',
    teamId: 'team-feynman',
    submittedAt: '2026-05-18T16:30:00.000Z',
    metrics: {
      holdout_accuracy: 0.992,
    },
    recomputedScore: 0.901,
    packageSha256: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    datasetAccess: {
      holdoutRowsViewed: 125,
      holdoutDownloaded: true,
    },
    leakageScore: 0.72,
    auditTrail: [
      'ingested:2026-05-18T16:31:00.000Z',
      'scored:2026-05-18T16:34:00.000Z',
    ],
  },
];

const submissionHistory = [
  {
    id: 'sub-history-001',
    teamId: 'team-curie',
    submittedAt: '2026-05-18T03:00:00.000Z',
  },
  {
    id: 'sub-history-002',
    teamId: 'team-curie',
    submittedAt: '2026-05-17T03:00:00.000Z',
  },
  {
    id: 'sub-history-003',
    teamId: 'team-curie',
    submittedAt: '2026-05-16T03:00:00.000Z',
  },
];

const checkedAt = '2026-05-20T00:00:00.000Z';

module.exports = {
  challenge,
  submissions,
  submissionHistory,
  checkedAt,
};
