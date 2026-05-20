"use strict";

const modelCatalog = [
  {
    id: "scibase-local-small",
    approved: true,
    dataBoundary: "internal",
    maxRetentionDays: 0,
    vendorDpa: true,
  },
  {
    id: "external-frontier-api",
    approved: true,
    dataBoundary: "external",
    maxRetentionDays: 30,
    vendorDpa: false,
  },
  {
    id: "lab-finetune-alpha",
    approved: false,
    dataBoundary: "internal",
    maxRetentionDays: 7,
    vendorDpa: true,
  },
];

const policies = {
  maxRetentionDays: 14,
  maxMonthlyTokens: 2000000,
  blockedIntegrations: ["public-webhook-test-sink"],
};

const requests = [
  {
    id: "aim-001",
    lab: "neuro-recovery",
    modelId: "scibase-local-small",
    dataClasses: ["human-subject"],
    requestedScopes: ["summarize", "peer-review-redlines"],
    integrations: ["dspace"],
    approvals: ["irb"],
    monthlyTokenEstimate: 480000,
  },
  {
    id: "aim-002",
    lab: "clinical-imaging",
    modelId: "external-frontier-api",
    dataClasses: ["clinical", "restricted-ip"],
    requestedScopes: ["summarize", "citation-suggest"],
    integrations: ["eln"],
    approvals: ["privacy"],
    monthlyTokenEstimate: 750000,
  },
  {
    id: "aim-003",
    lab: "materials-platform",
    modelId: "lab-finetune-alpha",
    dataClasses: ["open-science"],
    requestedScopes: ["repository-agent"],
    integrations: ["public-webhook-test-sink"],
    approvals: [],
    monthlyTokenEstimate: 2600000,
  },
  {
    id: "aim-004",
    lab: "doctoral-training",
    modelId: "scibase-local-small",
    dataClasses: ["student-record"],
    requestedScopes: ["admin-dashboard-assistant"],
    integrations: ["canvas"],
    approvals: [],
    monthlyTokenEstimate: 120000,
  },
];

module.exports = {
  modelCatalog,
  policies,
  requests,
};
