export const riskyQuotaLedger = {
  accountId: "LAB-QUOTA-1042",
  billingCycle: "2026-06",
  plan: {
    name: "Lab Pro",
    includedUnits: 10000,
    rolloverCapUnits: 3000,
    rolloverExpiresAfterCycles: 2,
    downgradeCarryLimitUnits: 1000,
  },
  priorCycle: {
    cycle: "2026-05",
    includedUnits: 10000,
    usedUnits: 6100,
    carryForwardUnits: 3900,
    postedRolloverUnits: 3900,
  },
  currentCycle: {
    includedUnits: 6000,
    planChangedFrom: "Lab Pro",
    planChangedTo: "Individual Pro",
    usageUnits: 11200,
    invoiceOverageUnits: 5200,
    availableRolloverUnits: 3900,
    rolloverAppliedUnits: 3900,
  },
  rolloverLots: [
    { lotId: "may-unused", units: 2500, originatedCycle: "2026-05", expiresAfterCycle: "2026-07", appliedUnits: 2500 },
    { lotId: "legacy-feb", units: 900, originatedCycle: "2026-02", expiresAfterCycle: "2026-04", appliedUnits: 900 },
    { lotId: "duplicate-may", units: 500, originatedCycle: "2026-05", expiresAfterCycle: "2026-07", appliedUnits: 500 },
    { lotId: "duplicate-may", units: 500, originatedCycle: "2026-05", expiresAfterCycle: "2026-07", appliedUnits: 0 },
  ],
  adjustments: [
    { adjustmentId: "manual-negative-1", units: -700, approvedByFinance: false, reason: "support request" },
  ],
  invoicePreview: {
    lineItems: [
      { code: "base-plan", units: 6000, amountUsd: 499 },
      { code: "ai-compute-overage", units: 5200, amountUsd: 416 },
      { code: "rollover-credit", units: -3900, amountUsd: -312 },
    ],
    reviewerHold: false,
  },
};

export const cleanQuotaLedger = {
  accountId: "LAB-QUOTA-2048",
  billingCycle: "2026-06",
  plan: {
    name: "Institutional",
    includedUnits: 50000,
    rolloverCapUnits: 12000,
    rolloverExpiresAfterCycles: 2,
    downgradeCarryLimitUnits: 4000,
  },
  priorCycle: {
    cycle: "2026-05",
    includedUnits: 50000,
    usedUnits: 42000,
    carryForwardUnits: 8000,
    postedRolloverUnits: 8000,
  },
  currentCycle: {
    includedUnits: 50000,
    planChangedFrom: "Institutional",
    planChangedTo: "Institutional",
    usageUnits: 54800,
    invoiceOverageUnits: 0,
    availableRolloverUnits: 8000,
    rolloverAppliedUnits: 4800,
  },
  rolloverLots: [
    { lotId: "may-unused", units: 8000, originatedCycle: "2026-05", expiresAfterCycle: "2026-07", appliedUnits: 4800 },
  ],
  adjustments: [
    { adjustmentId: "finance-credit-1", units: -300, approvedByFinance: true, reason: "documented SLA credit" },
  ],
  invoicePreview: {
    lineItems: [
      { code: "base-plan", units: 50000, amountUsd: 2499 },
      { code: "rollover-credit", units: -4800, amountUsd: 0 },
    ],
    reviewerHold: true,
  },
};
