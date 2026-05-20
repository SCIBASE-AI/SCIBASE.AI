const consortiums = [
  {
    id: "consortium-open-science-north",
    name: "Open Science North Consortium",
    discountCapPct: 18,
    stackingLimitPct: 24,
    eligiblePlans: ["institutional", "lab-plus"],
    members: [
      {
        institutionId: "northwestern-research",
        activeFrom: "2025-01-01",
        activeThrough: "2026-12-31",
        discountCapPct: 18,
      },
      {
        institutionId: "lakeview-bioinformatics",
        activeFrom: "2024-01-01",
        activeThrough: "2025-12-31",
        discountCapPct: 15,
      },
      {
        institutionId: "prairie-methods-lab",
        activeFrom: "2026-01-01",
        activeThrough: "2026-12-31",
        discountCapPct: 12,
      },
    ],
  },
  {
    id: "consortium-pacific-open-data",
    name: "Pacific Open Data Consortium",
    discountCapPct: 14,
    stackingLimitPct: 18,
    eligiblePlans: ["institutional"],
    members: [
      {
        institutionId: "bay-area-translational",
        activeFrom: "2025-07-01",
        activeThrough: "2026-06-30",
        discountCapPct: 14,
      },
    ],
  },
]

const invoices = [
  {
    invoiceId: "INV-2026-0501",
    accountId: "acct-risky-lakeview",
    institutionId: "lakeview-bioinformatics",
    planTier: "institutional",
    invoiceDate: "2026-05-01",
    claimedConsortiumId: "consortium-open-science-north",
    listAmountUsd: 48000,
    discounts: [
      { type: "consortium", pct: 20, source: "sales override" },
      { type: "coupon", pct: 8, source: "launch coupon" },
    ],
    evidence: {
      purchaseOrder: "PO-LAKE-881",
      membershipRosterSnapshot: null,
      renewalNoticeSentAt: null,
    },
  },
  {
    invoiceId: "INV-2026-0502",
    accountId: "acct-clean-northwestern",
    institutionId: "northwestern-research",
    planTier: "institutional",
    invoiceDate: "2026-05-01",
    claimedConsortiumId: "consortium-open-science-north",
    listAmountUsd: 62000,
    discounts: [{ type: "consortium", pct: 16, source: "contracted consortium tier" }],
    evidence: {
      purchaseOrder: "PO-NW-443",
      membershipRosterSnapshot: "roster-2026-04-30",
      renewalNoticeSentAt: "2026-04-15",
    },
  },
  {
    invoiceId: "INV-2026-0503",
    accountId: "acct-risky-prairie",
    institutionId: "prairie-methods-lab",
    planTier: "lab-plus",
    invoiceDate: "2026-05-01",
    claimedConsortiumId: "consortium-open-science-north",
    listAmountUsd: 27500,
    discounts: [
      { type: "consortium", pct: 13, source: "member agreement" },
      { type: "volume", pct: 9, source: "annual volume" },
      { type: "manual", pct: 5, source: "field override" },
    ],
    evidence: {
      purchaseOrder: "PO-PRAIRIE-220",
      membershipRosterSnapshot: "roster-2026-04-30",
      renewalNoticeSentAt: null,
    },
  },
  {
    invoiceId: "INV-2026-0504",
    accountId: "acct-clean-bay",
    institutionId: "bay-area-translational",
    planTier: "institutional",
    invoiceDate: "2026-05-01",
    claimedConsortiumId: "consortium-pacific-open-data",
    listAmountUsd: 38000,
    discounts: [{ type: "consortium", pct: 12, source: "pacific consortium schedule" }],
    evidence: {
      purchaseOrder: "PO-BAY-991",
      membershipRosterSnapshot: "pacific-roster-2026-04",
      renewalNoticeSentAt: "2026-04-03",
    },
  },
]

module.exports = { consortiums, invoices }
