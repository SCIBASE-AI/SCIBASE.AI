const sampleWorkspace = {
  workspaceId: 'project-neuro-catalyst',
  policy: {
    nearExpiryWarningDays: 7,
  },
  users: [
    {
      userId: 'owner-1',
      name: 'Dr. Lina Owner',
      identity: { mfa: true, saml: true, orcid: true },
    },
    {
      userId: 'delegate-2',
      name: 'Postdoc Delegate',
      identity: { mfa: true, saml: true, orcid: true },
    },
    {
      userId: 'delegate-7',
      name: 'Export Contractor',
      identity: { mfa: false, saml: true, orcid: false },
    },
    {
      userId: 'delegate-9',
      name: 'Archive Assistant',
      identity: { mfa: true, saml: true, orcid: true },
    },
    {
      userId: 'approver-3',
      name: 'Independent Project Approver',
      identity: { mfa: true, saml: true, orcid: true },
    },
  ],
  delegationRequests: [
    {
      requestId: 'del-publish-2',
      action: 'publish_release',
      requestorId: 'owner-1',
      delegateId: 'delegate-2',
      approverId: 'approver-3',
      sponsorId: 'owner-1',
      sponsorApproval: false,
      scopes: ['manuscript:approve', 'metadata:update', 'release:submit'],
      expiresAt: '2026-06-20T00:00:00Z',
      requiresIdentityPosture: ['mfa', 'saml', 'orcid'],
    },
    {
      requestId: 'del-export-7',
      action: 'restricted_data_export',
      requestorId: 'owner-1',
      delegateId: 'delegate-7',
      approverId: 'approver-3',
      sponsorId: 'owner-1',
      sponsorApproval: true,
      scopes: ['dataset:read', 'export:restricted'],
      expiresAt: '2026-06-10T00:00:00Z',
      requiresIdentityPosture: ['mfa', 'saml', 'orcid'],
    },
    {
      requestId: 'del-transfer-3',
      action: 'role_transfer',
      requestorId: 'delegate-2',
      delegateId: 'delegate-2',
      approverId: 'delegate-2',
      sponsorId: 'owner-1',
      sponsorApproval: true,
      scopes: ['role:transfer'],
      expiresAt: '2026-06-15T00:00:00Z',
      requiresIdentityPosture: ['mfa', 'saml'],
    },
    {
      requestId: 'del-archive-5',
      action: 'archive_freeze',
      requestorId: 'owner-1',
      delegateId: 'delegate-9',
      approverId: 'approver-3',
      sponsorId: 'owner-1',
      sponsorApproval: true,
      scopes: ['archive:freeze', 'citation:snapshot', 'repository:admin'],
      expiresAt: '2026-06-15T00:00:00Z',
      requiresIdentityPosture: ['mfa', 'saml'],
    },
  ],
};

const compliantWorkspace = {
  workspaceId: 'project-clean-delegation',
  policy: {
    nearExpiryWarningDays: 7,
  },
  users: [
    {
      userId: 'owner-5',
      name: 'Dr. Maya Sponsor',
      identity: { mfa: true, saml: true, orcid: true },
    },
    {
      userId: 'delegate-5',
      name: 'Release Delegate',
      identity: { mfa: true, saml: true, orcid: true },
    },
    {
      userId: 'approver-8',
      name: 'Independent Approver',
      identity: { mfa: true, saml: true, orcid: true },
    },
  ],
  delegationRequests: [
    {
      requestId: 'del-clean-1',
      action: 'publish_release',
      requestorId: 'owner-5',
      delegateId: 'delegate-5',
      approverId: 'approver-8',
      sponsorId: 'owner-5',
      sponsorApproval: true,
      scopes: ['manuscript:approve', 'metadata:update', 'release:submit'],
      expiresAt: '2026-05-26T00:00:00Z',
      requiresIdentityPosture: ['mfa', 'saml', 'orcid'],
    },
  ],
};

module.exports = {
  sampleWorkspace,
  compliantWorkspace,
};
