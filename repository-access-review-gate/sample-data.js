const sampleRepository = {
  repositoryId: 'repo-sci-artery-flow-042',
  title: 'Artery Flow Digital Twin Release',
  policy: {
    nearExpiryWarningDays: 14,
  },
  release: {
    tag: 'v2.1.0',
    visibility: 'public',
  },
  collaborators: [
    {
      userId: 'u-owner-1',
      name: 'Dr. Amina Park',
      role: 'owner',
      affiliation: 'internal',
      access: {
        scope: 'repository-admin',
        releaseApproved: true,
      },
    },
    {
      userId: 'u-admin-2',
      name: 'Samir Dev',
      role: 'admin',
      affiliation: 'internal',
      access: {
        scope: 'all-components',
        releaseApproved: false,
      },
    },
    {
      userId: 'u-ext-17',
      name: 'External Reviewer 17',
      role: 'reviewer',
      affiliation: 'external',
      access: {
        scope: 'manuscript,data',
        expiresAt: '2026-05-01T00:00:00Z',
        releaseApproved: true,
        canDownloadRestrictedData: true,
        dataUseApprovalExpiresAt: '2026-05-05T00:00:00Z',
      },
    },
    {
      userId: 'u-analyst-4',
      name: 'Mina Analyst',
      role: 'maintainer',
      affiliation: 'internal',
      access: {
        scope: 'code,results',
        releaseApproved: true,
      },
    },
  ],
  artifacts: [
    {
      artifactId: 'data-waveforms',
      path: 'data/restricted-waveforms.parquet',
      owner: 'data-steward',
      license: 'restricted-dua',
      secretLink: false,
    },
    {
      artifactId: 'supplement-secret',
      path: 'results/supplemental-viewer.url',
      owner: 'security-review',
      license: 'internal-review',
      secretLink: true,
    },
    {
      artifactId: 'manuscript',
      path: 'manuscript/preprint.md',
      owner: 'u-owner-1',
      license: 'cc-by-4.0',
      secretLink: false,
    },
  ],
};

const readyRepository = {
  repositoryId: 'repo-sci-hydrogel-ready',
  title: 'Hydrogel Stress Test Release',
  policy: {
    nearExpiryWarningDays: 14,
  },
  release: {
    tag: 'v1.4.2',
    visibility: 'institutional',
  },
  collaborators: [
    {
      userId: 'u-owner-8',
      name: 'Dr. Tessa Rowan',
      role: 'owner',
      affiliation: 'internal',
      access: {
        scope: 'repository-admin',
        releaseApproved: true,
      },
    },
    {
      userId: 'u-ext-22',
      name: 'External Reviewer 22',
      role: 'reviewer',
      affiliation: 'external',
      access: {
        scope: 'manuscript',
        expiresAt: '2026-05-29T00:00:00Z',
        releaseApproved: true,
      },
    },
  ],
  artifacts: [
    {
      artifactId: 'preprint',
      path: 'manuscript/preprint.md',
      owner: 'u-owner-8',
      license: 'cc-by-4.0',
      secretLink: false,
    },
  ],
};

module.exports = {
  sampleRepository,
  readyRepository,
};
