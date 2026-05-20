module.exports = [
  {
    accountId: "uni-northstar",
    accountName: "Northstar University Consortium",
    currency: "USD",
    evidence: [
      {
        key: "signed-order-form-q2",
        status: "approved",
        source: "contracts/northstar-q2-order-form.pdf",
        owner: "enterprise-sales",
        observedAt: "2026-05-06",
      },
      {
        key: "admin-seat-acceptance",
        status: "approved",
        source: "customer-portal/seat-acceptance-3912",
        owner: "customer-admin",
        observedAt: "2026-05-16",
      },
      {
        key: "compute-usage-summary",
        status: "pending",
        source: "usage-meter/may-ai-compute-summary.json",
        owner: "finops",
        observedAt: "2026-05-19",
        note: "Usage digest generated but not approved by lab finance.",
      },
    ],
    billingEvents: [
      {
        id: "sub-q2-institutional-seat-pack",
        revenueStream: "subscription",
        amount: 18000,
        periodEnd: "2026-05-15",
        requiredEvidence: ["signed-order-form-q2", "admin-seat-acceptance"],
      },
      {
        id: "ai-compute-may-burst",
        revenueStream: "ai_compute",
        amount: 4200,
        periodEnd: "2026-05-10",
        requiredEvidence: ["signed-order-form-q2", "compute-usage-summary"],
      },
    ],
  },
  {
    accountId: "gov-polaris",
    accountName: "Polaris Research Office",
    currency: "USD",
    evidence: [
      {
        key: "analytics-export-manifest",
        status: "approved",
        source: "exports/polaris/manifest-2026-05.json",
        owner: "data-licensing",
        observedAt: "2026-05-12",
      },
      {
        key: "aggregation-threshold-review",
        status: "rejected",
        source: "privacy-review/threshold-exception-18",
        owner: "privacy",
        observedAt: "2026-05-14",
        note: "One cohort fails minimum aggregation threshold.",
      },
    ],
    billingEvents: [
      {
        id: "license-export-wave-3",
        revenueStream: "data_license",
        amount: 12500,
        periodEnd: "2026-05-01",
        requiredEvidence: ["analytics-export-manifest", "aggregation-threshold-review"],
      },
    ],
  },
  {
    accountId: "lab-kite",
    accountName: "Kite Bioinformatics Lab",
    currency: "USD",
    evidence: [
      {
        key: "milestone-demo-recording",
        status: "approved",
        source: "demos/kite-repro-check-demo.mp4",
        owner: "solutions",
        observedAt: "2026-05-04",
      },
      {
        key: "customer-acceptance-email",
        status: "missing",
        source: null,
        owner: "customer-success",
        observedAt: null,
      },
    ],
    billingEvents: [
      {
        id: "reproducibility-milestone-2",
        revenueStream: "professional_services",
        amount: 7600,
        periodEnd: "2026-04-28",
        requiredEvidence: ["milestone-demo-recording", "customer-acceptance-email"],
      },
    ],
  },
  {
    accountId: "startup-halo",
    accountName: "Halo Methods",
    currency: "USD",
    evidence: [
      {
        key: "trial-conversion-order",
        status: "approved",
        source: "contracts/halo-pro-conversion.pdf",
        owner: "sales",
        observedAt: "2026-05-18",
      },
      {
        key: "billing-contact-confirmed",
        status: "approved",
        source: "crm/halo-billing-contact",
        owner: "revops",
        observedAt: "2026-05-18",
      },
    ],
    billingEvents: [
      {
        id: "pro-conversion-first-month",
        revenueStream: "subscription",
        amount: 950,
        periodEnd: "2026-05-19",
        requiredEvidence: ["trial-conversion-order", "billing-contact-confirmed"],
      },
    ],
  },
];
