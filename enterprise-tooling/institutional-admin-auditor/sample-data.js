const enterprisePolicy = {
  reviewDate: "2026-05-28T00:00:00Z",
};

const riskyTenant = {
  id: "tenant-northstar-university",
  institutionName: "Northstar University Research Office",
  admins: [
    { email: "ops@example.edu", role: "admin", mfaEnabled: false },
    { email: "exports@example.edu", role: "export_operator", mfaEnabled: true },
  ],
  rolePolicy: {},
  dashboard: {
    widgets: ["projectOverview", "usageStats"],
    dataFreshnessMinutes: 180,
  },
  api: {
    enabled: true,
    scopes: ["users:read"],
    keyRotationDays: 0,
  },
  webhooks: [
    {
      url: "https://repo.example.edu/hooks/scibase",
      signingSecretConfigured: false,
      retryPolicy: {},
    },
  ],
  exportPipelines: [
    {
      id: "pubmed-export",
      destination: "PubMed Central",
      format: "",
      requiresPiiScrub: true,
      piiScrubEnabled: false,
      lastDryRun: { status: "failed" },
    },
  ],
  compliance: {
    auditLogging: false,
    funderMandateTracking: false,
  },
  sla: {},
  contract: {
    requiresDpa: true,
    dataProcessingAgreementId: "",
  },
};

const readyTenant = {
  id: "tenant-midwest-consortium",
  institutionName: "Midwest Research Consortium",
  admins: [
    { email: "owner@example.edu", role: "owner", mfaEnabled: true },
    { email: "exports@example.edu", role: "export_operator", mfaEnabled: true },
  ],
  rolePolicy: {
    leastPrivilegeReviewAt: "2026-05-01T10:00:00Z",
  },
  dashboard: {
    widgets: [
      "projectOverview",
      "contributorAnalytics",
      "usageStats",
      "complianceTracking",
      "exportPipelineHealth",
    ],
    dataFreshnessMinutes: 30,
  },
  api: {
    enabled: true,
    scopes: ["projects:read", "exports:write"],
    keyRotationDays: 90,
  },
  webhooks: [
    {
      url: "https://repo.example.edu/hooks/scibase",
      signingSecretConfigured: true,
      retryPolicy: { maxAttempts: 5 },
    },
  ],
  exportPipelines: [
    {
      id: "zenodo-export",
      destination: "Zenodo",
      format: "DataCite JSON",
      requiresPiiScrub: true,
      piiScrubEnabled: true,
      lastDryRun: { status: "passed" },
    },
  ],
  compliance: {
    auditLogging: true,
    funderMandateTracking: true,
  },
  sla: {
    tier: "enterprise",
    responseHours: 4,
  },
  contract: {
    requiresDpa: true,
    dataProcessingAgreementId: "DPA-2026-019",
  },
};

module.exports = {
  enterprisePolicy,
  readyTenant,
  riskyTenant,
};
