'use strict';

const checkedAt = '2026-05-20T00:00:00.000Z';

const snapshots = [
  {
    repositoryId: 'repo-protein-sim',
    versionId: 'v1.4.0',
    snapshotId: 'snap-protein-140',
    expectedHashes: {
      manuscript: 'sha256-manuscript-140',
      code: 'sha256-code-140',
      data: 'sha256-data-140',
      results: 'sha256-results-140',
      environment: 'sha256-env-140',
    },
    restoredHashes: {
      manuscript: 'sha256-manuscript-140',
      code: 'sha256-code-140',
      data: 'sha256-data-140',
      results: 'sha256-results-140',
      environment: 'sha256-env-140',
    },
    lfsObjects: [
      { id: 'lfs-dataset-140', available: true },
      { id: 'lfs-weights-140', available: true },
    ],
    backup: {
      copies: 3,
      encryptionKeyEscrowed: true,
      retentionExpiresAt: '2027-05-20T00:00:00.000Z',
    },
    restoreDrill: {
      status: 'passed',
      durationMinutes: 74,
    },
    release: {
      signedTag: true,
      forkedFrom: null,
      forkLineageVerified: true,
    },
    citation: {
      doi: '10.5555/scibase.protein.140',
      targetStatus: 'active',
    },
  },
  {
    repositoryId: 'repo-notebook-bench',
    versionId: 'v0.9.2',
    snapshotId: 'snap-notebook-092',
    expectedHashes: {
      manuscript: 'sha256-manuscript-092',
      code: 'sha256-code-092',
      data: 'sha256-data-092',
      results: 'sha256-results-092',
      environment: 'sha256-env-092',
    },
    restoredHashes: {
      manuscript: 'sha256-manuscript-092',
      code: 'sha256-code-092',
      data: 'sha256-data-092',
      results: 'sha256-results-092',
      environment: 'sha256-env-092',
    },
    lfsObjects: [
      { id: 'lfs-benchmark-092', available: true },
    ],
    backup: {
      copies: 2,
      encryptionKeyEscrowed: true,
      retentionExpiresAt: '2026-12-20T00:00:00.000Z',
    },
    restoreDrill: {
      status: 'passed',
      durationMinutes: 145,
    },
    release: {
      signedTag: false,
      forkedFrom: 'repo-benchmark-seed',
      forkLineageVerified: false,
    },
    citation: {
      doi: '10.5555/scibase.notebook.092',
      targetStatus: 'active',
    },
  },
  {
    repositoryId: 'repo-cohort-data',
    versionId: 'v2.1.0',
    snapshotId: 'snap-cohort-210',
    expectedHashes: {
      manuscript: 'sha256-manuscript-210',
      code: 'sha256-code-210',
      data: 'sha256-data-210',
      results: 'sha256-results-210',
      environment: 'sha256-env-210',
    },
    restoredHashes: {
      manuscript: 'sha256-manuscript-210',
      code: 'sha256-code-210',
      data: 'sha256-data-drifted',
      results: 'sha256-results-210',
      environment: 'sha256-env-210',
    },
    lfsObjects: [
      { id: 'lfs-cohort-raw-210', available: false },
      { id: 'lfs-cohort-derived-210', available: true },
    ],
    backup: {
      copies: 2,
      encryptionKeyEscrowed: true,
      retentionExpiresAt: '2027-01-15T00:00:00.000Z',
    },
    restoreDrill: {
      status: 'passed',
      durationMinutes: 96,
    },
    release: {
      signedTag: true,
      forkedFrom: null,
      forkLineageVerified: true,
    },
    citation: {
      doi: '10.5555/scibase.cohort.210',
      targetStatus: 'active',
    },
  },
  {
    repositoryId: 'repo-legacy-model',
    versionId: 'v0.3.1',
    snapshotId: 'snap-legacy-031',
    expectedHashes: {
      manuscript: 'sha256-manuscript-031',
      code: 'sha256-code-031',
      data: 'sha256-data-031',
      results: 'sha256-results-031',
      environment: 'sha256-env-031',
    },
    restoredHashes: {},
    lfsObjects: [
      { id: 'lfs-legacy-031', available: false },
    ],
    backup: {
      copies: 1,
      encryptionKeyEscrowed: false,
      retentionExpiresAt: '2026-04-01T00:00:00.000Z',
    },
    restoreDrill: {
      status: 'failed',
      durationMinutes: 0,
    },
    release: {
      signedTag: false,
      forkedFrom: null,
      forkLineageVerified: false,
    },
    citation: {
      doi: null,
      targetStatus: 'missing',
    },
  },
];

module.exports = {
  checkedAt,
  snapshots,
  cleanSnapshots: [snapshots[0]],
};
