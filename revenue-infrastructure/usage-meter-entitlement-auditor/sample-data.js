"use strict";

const institutionalAccount = {
  id: "acct-northstar-lab",
  name: "Northstar Translational Lab",
  activePrivateProjects: 9,
  plan: {
    tier: "lab",
    computeUnitQuota: 1000,
    trialComputeUnitsRemaining: 25,
    analyticsApiMonthlyLimit: 10000,
    privateProjectLimit: 6,
    maxDiscountPercent: 20,
  },
  enforcement: {
    computeHardLimitEnabled: false,
  },
  usageEvents: [
    {
      id: "usage-001",
      meter: "ai_compute",
      units: 740,
      billable: true,
      accountState: "paid",
      source: "peer-review-summarizer",
    },
    {
      id: "usage-002",
      meter: "ai_compute",
      units: 420,
      billable: true,
      accountState: "paid",
      source: "notebook-reproducibility-runner",
    },
    {
      id: "usage-003",
      meter: "ai_compute",
      units: 60,
      billable: true,
      accountState: "trial",
      source: "foundation-model-finetune-preview",
    },
    {
      id: "usage-004",
      meter: "analytics_api",
      units: 14500,
      billable: true,
      overageBilled: false,
      source: "citation-network-api",
    },
  ],
  topups: [
    {
      id: "topup-001",
      provider: "stripe",
      externalPaymentId: "pi_123",
      computeUnits: 200,
    },
    {
      id: "topup-002",
      provider: "stripe",
      externalPaymentId: "pi_123",
      computeUnits: 200,
    },
  ],
  invoices: [
    {
      id: "inv-001",
      collectionMethod: "institutional_invoice",
      purchaseOrderId: "",
      discountPercent: 35,
      revenueOpsApprovalId: "",
      usageEventIds: ["usage-001", "usage-004"],
    },
    {
      id: "inv-002",
      collectionMethod: "stripe",
      purchaseOrderId: null,
      discountPercent: 0,
      revenueOpsApprovalId: "",
      usageEventIds: [],
    },
  ],
  licensingExports: [
    {
      id: "export-001",
      customer: "National Research Policy Office",
      fields: ["citation_network", "dataset_reuse_score", "private_project_title", "raw_content_excerpt"],
    },
  ],
  paymentProviderBalances: [
    {
      provider: "stripe",
      recognizedRevenue: 18450.25,
    },
    {
      provider: "paypal",
      recognizedRevenue: 18449.95,
    },
    {
      provider: "institutional_ledger",
      recognizedRevenue: 18220.25,
    },
  ],
};

module.exports = {
  institutionalAccount,
};
