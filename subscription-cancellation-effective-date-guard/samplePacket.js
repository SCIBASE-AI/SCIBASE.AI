module.exports = {
  accountId: "inst-lab-204",
  cancellationId: "can-2026-05-alpha",
  requestedAt: "2026-05-15",
  contractEndDate: "2026-06-01",
  effectiveDate: "2026-05-31",
  requiredNoticeDays: 30,
  earlyTerminationApprovalId: "",
  refundDueCents: 125000,
  financeReviewId: "",
  computeWindDownDate: "2026-06-07",
  analyticsCutoffDate: "2026-06-01",
  institutionalPoException: true,
  poCloseoutId: "",
  renewalInvoices: [
    { id: "inv-renew-991", issueDate: "2026-06-01", status: "scheduled", amountCents: 4800000 },
    { id: "inv-final-990", issueDate: "2026-05-20", status: "issued", amountCents: 1200000 }
  ],
  computeCreditLots: [
    { id: "cc-ai-771", remainingUnits: 430, expiresAt: "2026-07-31" },
    { id: "cc-ai-772", remainingUnits: 0, expiresAt: "2026-06-01" }
  ],
  analyticsExportGrants: [
    { id: "lic-export-44", dataset: "citation-network", accessUntil: "2026-06-30" }
  ]
};
