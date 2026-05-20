const policy = {
  asOf: "2026-05-20T12:30:00.000Z",
  webhookSecret: "synthetic-revenue-secret",
  restrictedJurisdictions: ["IR", "KP", "SY"],
  deniedEntities: ["Helix Restricted Research Bureau", "Obsidian Procurement Front"],
  allowedExportJurisdictions: ["US", "EU", "UK", "CA", "JP", "AU"],
  allowedLicensingDataClasses: ["AGGREGATED_PUBLIC", "ANONYMIZED_METADATA", "REPRODUCIBILITY_SCORE"],
  prohibitedPaymentRailsByCountry: {
    IR: ["wire", "card", "ach"],
    KP: ["wire", "card", "ach"],
    SY: ["wire", "card"],
  },
  manualReviewThresholdUsd: 50000,
  maxAutoApprovedSeats: 250,
}

const invoices = [
  {
    id: "INV-2026-001",
    amountUsd: 42000,
    paymentRail: "wire",
    complianceApprovalId: "COMP-OK-442",
    customer: {
      id: "CUST-UCL-01",
      legalName: "University Clinical Lab",
      billingName: "University Clinical Lab",
      parentEntity: "University Clinical Lab",
      country: "US",
      kybStatus: "verified",
    },
    lines: [
      {
        id: "line-subscription",
        type: "subscription",
        seats: 120,
        dataClasses: [],
      },
      {
        id: "line-analytics",
        type: "analytics_license",
        dataClasses: ["ANONYMIZED_METADATA", "REPRODUCIBILITY_SCORE"],
        destinationCountry: "US",
      },
    ],
  },
  {
    id: "INV-2026-002",
    amountUsd: 76000,
    paymentRail: "wire",
    complianceApprovalId: null,
    customer: {
      id: "CUST-HRRB-02",
      legalName: "Helix Restricted Research Bureau",
      billingName: "HRRB Procurement",
      parentEntity: "Helix Restricted Research Bureau",
      country: "EU",
      kybStatus: "pending",
    },
    lines: [
      {
        id: "line-ai-compute",
        type: "ai_compute",
        modelFamily: "dual-use-foundation-bio",
        exportControlledModel: true,
        exportLicenseId: null,
        dataClasses: [],
      },
    ],
  },
  {
    id: "INV-2026-003",
    amountUsd: 18500,
    paymentRail: "wire",
    complianceApprovalId: null,
    customer: {
      id: "CUST-OBS-03",
      legalName: "Open Materials Exchange",
      billingName: "Open Materials Exchange",
      parentEntity: "Open Materials Exchange",
      country: "SG",
      kybStatus: "verified",
    },
    lines: [
      {
        id: "line-license-sg",
        type: "analytics_license",
        dataClasses: ["AGGREGATED_PUBLIC"],
        destinationCountry: "SG",
      },
    ],
  },
  {
    id: "INV-2026-004",
    amountUsd: 92000,
    paymentRail: "card",
    complianceApprovalId: "COMP-MANUAL-910",
    customer: {
      id: "CUST-IR-04",
      legalName: "Regional Research Procurement Office",
      billingName: "Regional Research Procurement Office",
      parentEntity: "Regional Research Procurement Office",
      country: "IR",
      kybStatus: "verified",
    },
    lines: [
      {
        id: "line-enterprise",
        type: "subscription",
        seats: 400,
        enterpriseOrderFormId: null,
        dataClasses: [],
      },
    ],
  },
]

module.exports = { policy, invoices }
