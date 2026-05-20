'use strict';

const checkedAt = '2026-05-20T00:00:00.000Z';

const humanOwners = [
  {
    id: 'user-ada',
    status: 'active',
    mfaVerified: true,
    samlVerified: true,
    orcidVerified: true,
  },
  {
    id: 'user-bohr',
    status: 'active',
    mfaVerified: true,
    samlVerified: true,
    orcidVerified: false,
  },
  {
    id: 'user-curie',
    status: 'active',
    mfaVerified: true,
    samlVerified: true,
    orcidVerified: true,
  },
  {
    id: 'user-darwin',
    status: 'departed',
    mfaVerified: false,
    samlVerified: false,
    orcidVerified: true,
  },
];

const sponsors = [
  {
    id: 'sponsor-repo-steward',
    status: 'active',
  },
  {
    id: 'sponsor-security',
    status: 'active',
  },
  {
    id: 'sponsor-expired',
    status: 'expired',
  },
];

const serviceAccounts = [
  {
    projectId: 'project-protein-folding',
    accountId: 'svc-dataset-import',
    ownerId: 'user-ada',
    sponsorId: 'sponsor-repo-steward',
    scopes: ['repo:read', 'dataset:import', 'metadata:update'],
    token: {
      issuedAt: '2026-04-01T00:00:00.000Z',
      lastRotatedAt: '2026-04-15T00:00:00.000Z',
      lastUsedAt: '2026-05-18T00:00:00.000Z',
      expiresAt: '2026-08-01T00:00:00.000Z',
    },
  },
  {
    projectId: 'project-notebook-release',
    accountId: 'svc-notebook-ci',
    ownerId: 'user-bohr',
    sponsorId: 'sponsor-repo-steward',
    scopes: ['repo:read', 'ci:run', 'artifact:write'],
    token: {
      issuedAt: '2026-01-04T00:00:00.000Z',
      lastRotatedAt: '2026-04-05T00:00:00.000Z',
      lastUsedAt: '2026-02-21T00:00:00.000Z',
      expiresAt: '2026-05-28T00:00:00.000Z',
    },
  },
  {
    projectId: 'project-restricted-cohort',
    accountId: 'svc-external-sync',
    ownerId: 'user-curie',
    sponsorId: 'sponsor-expired',
    scopes: ['repo:read', 'artifact:read', 'restricted-data:export'],
    token: {
      issuedAt: '2026-03-01T00:00:00.000Z',
      lastRotatedAt: '2026-03-30T00:00:00.000Z',
      lastUsedAt: '2026-05-19T00:00:00.000Z',
      expiresAt: '2026-07-01T00:00:00.000Z',
    },
    externalIntegration: {
      provider: 'external-lab-sync',
      approvedVendor: false,
      dataExport: true,
      dataUseAgreement: false,
    },
  },
  {
    projectId: 'project-legacy-review',
    accountId: 'svc-legacy-admin',
    ownerId: 'user-darwin',
    sponsorId: 'sponsor-security',
    scopes: ['repo:read', 'admin:*', 'members:write'],
    token: {
      issuedAt: '2025-11-02T00:00:00.000Z',
      lastRotatedAt: '2025-11-02T00:00:00.000Z',
      lastUsedAt: '2026-05-01T00:00:00.000Z',
      expiresAt: '2026-06-01T00:00:00.000Z',
    },
    secretExposure: 'Token fingerprint appeared in a public notebook output.',
  },
];

module.exports = {
  checkedAt,
  humanOwners,
  sponsors,
  serviceAccounts,
  cleanServiceAccounts: [serviceAccounts[0]],
};
