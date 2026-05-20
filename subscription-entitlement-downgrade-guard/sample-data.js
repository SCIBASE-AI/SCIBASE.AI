"use strict";

const downgradePacket = {
  accountId: "acct-enterprise-neuro",
  requestedAt: "2026-05-20T12:00:00Z",
  currentPlan: {
    name: "Enterprise",
    seatLimit: 80,
    storageGb: 2000,
    monthlyComputeHours: 900,
    features: ["saml", "audit-log", "private-projects", "priority-support", "data-room"],
  },
  requestedPlan: {
    name: "Team",
    seatLimit: 25,
    storageGb: 500,
    monthlyComputeHours: 250,
    features: ["private-projects", "audit-log"],
  },
  usage: {
    activeSeats: 37,
    storageGb: 640,
    committedComputeHours: 310,
    lockedFeatures: ["saml", "data-room"],
    unpaidInvoices: [{ invoiceId: "inv-908", amountUsd: 4200, daysPastDue: 12 }],
    annualCommitmentEndsAt: "2026-08-01T00:00:00Z",
  },
  downgradePolicy: {
    allowGraceDays: 14,
    requireFinanceReviewForPastDue: true,
    lockedFeaturesRequireMigrationPlan: true,
  },
};

module.exports = { downgradePacket };
