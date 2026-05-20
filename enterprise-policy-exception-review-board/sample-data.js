const sampleInstitution = {
  institutionId: 'inst-northstar-research',
  policy: {
    nearExpiryWarningDays: 14,
  },
  owners: [
    { ownerId: 'owner-export', name: 'Export Governance Lead', active: true },
    { ownerId: 'owner-api', name: 'Integration Steward', active: true },
    { ownerId: 'owner-compute', name: 'Compute Governance Lead', active: true },
  ],
  exceptions: [
    {
      exceptionId: 'exc-restricted-export',
      category: 'restricted_dataset_export',
      ownerId: 'owner-export',
      expiresAt: '2026-07-01T00:00:00Z',
      requiredApprovals: ['dpa', 'dataSteward', 'security'],
      approvals: { dpa: false, dataSteward: true, security: true },
      requiredControls: ['exportHold', 'watermarkedBundle'],
      controls: ['exportHold', 'watermarkedBundle'],
    },
    {
      exceptionId: 'exc-api-schema',
      category: 'api_schema_grace_period',
      ownerId: 'owner-api',
      expiresAt: '2026-04-01T00:00:00Z',
      requiredApprovals: ['security'],
      approvals: { security: true },
      requiredControls: ['sandboxConsumerAck'],
      controls: ['sandboxConsumerAck'],
    },
    {
      exceptionId: 'exc-compute-vendor',
      category: 'compute_vendor_exception',
      ownerId: 'owner-compute',
      expiresAt: '2026-08-01T00:00:00Z',
      requiredApprovals: ['security', 'dpa'],
      approvals: { security: true, dpa: true },
      requiredControls: ['scopedToken', 'auditSampling'],
      controls: ['scopedToken'],
    },
    {
      exceptionId: 'exc-orphaned-integration',
      category: 'institutional_connector_exception',
      ownerId: null,
      expiresAt: '2026-08-15T00:00:00Z',
      requiredApprovals: ['security'],
      approvals: { security: true },
      requiredControls: ['scopedToken'],
      controls: ['scopedToken'],
    },
  ],
};

const compliantInstitution = {
  institutionId: 'inst-cleanroom-research',
  policy: {
    nearExpiryWarningDays: 14,
  },
  owners: [
    { ownerId: 'owner-clean', name: 'Cleanroom Governance Lead', active: true },
  ],
  exceptions: [
    {
      exceptionId: 'exc-clean-export',
      category: 'restricted_dataset_export',
      ownerId: 'owner-clean',
      expiresAt: '2026-05-30T00:00:00Z',
      requiredApprovals: ['dpa', 'dataSteward', 'security'],
      approvals: { dpa: true, dataSteward: true, security: true },
      requiredControls: ['exportHold', 'watermarkedBundle'],
      controls: ['exportHold', 'watermarkedBundle'],
    },
  ],
};

module.exports = {
  sampleInstitution,
  compliantInstitution,
};
