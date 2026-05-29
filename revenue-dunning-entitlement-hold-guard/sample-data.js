const billingBatch = {
  id: "revenue-dunning-2026-05-29",
  generatedAt: "2026-05-29T15:04:00.000Z",
  accounts: [
    {
      id: "acct-lab-1",
      plan: "lab-pro",
      invoiceStatus: "paid",
      failedAttempts: 0,
      daysPastDue: 0,
      dunningNotices: [],
      entitlement: "active",
      computeCreditsRemaining: 120,
      institutionalInvoice: false,
      analyticsExportQueued: false
    },
    {
      id: "acct-inst-2",
      plan: "institution",
      invoiceStatus: "failed",
      failedAttempts: 1,
      daysPastDue: 5,
      dunningNotices: ["day-1"],
      entitlement: "active",
      computeCreditsRemaining: 700,
      institutionalInvoice: true,
      analyticsExportQueued: true
    },
    {
      id: "acct-ai-3",
      plan: "compute-pack",
      invoiceStatus: "failed",
      failedAttempts: 4,
      daysPastDue: 18,
      dunningNotices: ["day-1", "day-7", "day-14"],
      entitlement: "active",
      computeCreditsRemaining: 30,
      institutionalInvoice: false,
      analyticsExportQueued: false
    },
    {
      id: "acct-api-4",
      plan: "analytics-api",
      invoiceStatus: "failed",
      failedAttempts: 2,
      daysPastDue: 9,
      dunningNotices: ["day-1"],
      entitlement: "grace",
      computeCreditsRemaining: 0,
      institutionalInvoice: false,
      analyticsExportQueued: true
    }
  ]
};

module.exports = { billingBatch };
