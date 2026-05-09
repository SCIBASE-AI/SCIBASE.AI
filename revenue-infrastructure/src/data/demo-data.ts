import type {
  Account,
  Coupon,
  LicensingContract,
  PricingPlan,
  ResearchMetadataEvent
} from "../types.js"

export const pricingPlans: PricingPlan[] = [
  {
    id: "individual-pro",
    name: "Individual Pro",
    kind: "individual",
    monthlyBaseCents: 2900,
    annualDiscountPercent: 15,
    includedSeats: 1,
    extraSeatCents: 0,
    trialDays: 14,
    volumeDiscounts: [],
    quotas: [
      { metric: "ai_tokens", included: 1_000_000, overageCents: 4, unitLabel: "1k tokens" },
      { metric: "compute_minutes", included: 120, overageCents: 18, unitLabel: "minute" },
      { metric: "reproducibility_runs", included: 3, overageCents: 900, unitLabel: "run" },
      { metric: "storage_gb", included: 50, overageCents: 35, unitLabel: "GB" },
      { metric: "licensing_api_calls", included: 0, overageCents: 2, unitLabel: "100 calls" }
    ],
    features: [
      { key: "private_projects", label: "Private projects", included: true },
      { key: "project_analytics", label: "Project analytics", included: true },
      { key: "group_permissions", label: "Group permissions", included: false },
      { key: "sla", label: "SLA", included: false }
    ]
  },
  {
    id: "lab-team",
    name: "Lab Team",
    kind: "lab",
    monthlyBaseCents: 24900,
    annualDiscountPercent: 18,
    includedSeats: 8,
    extraSeatCents: 1900,
    trialDays: 30,
    volumeDiscounts: [
      { minSeats: 15, discountPercent: 5 },
      { minSeats: 30, discountPercent: 10 }
    ],
    quotas: [
      { metric: "ai_tokens", included: 12_000_000, overageCents: 3, unitLabel: "1k tokens" },
      { metric: "compute_minutes", included: 1_500, overageCents: 14, unitLabel: "minute" },
      { metric: "reproducibility_runs", included: 50, overageCents: 650, unitLabel: "run" },
      { metric: "storage_gb", included: 1_000, overageCents: 20, unitLabel: "GB" },
      { metric: "licensing_api_calls", included: 0, overageCents: 2, unitLabel: "100 calls" }
    ],
    features: [
      { key: "private_projects", label: "Private projects", included: true },
      { key: "project_analytics", label: "Project analytics", included: true },
      { key: "group_permissions", label: "Group permissions", included: true },
      { key: "priority_support", label: "Priority support", included: true },
      { key: "sla", label: "SLA", included: false }
    ]
  },
  {
    id: "institution-enterprise",
    name: "Institution Enterprise",
    kind: "institution",
    monthlyBaseCents: 250000,
    annualDiscountPercent: 22,
    includedSeats: 100,
    extraSeatCents: 900,
    trialDays: 45,
    volumeDiscounts: [
      { minSeats: 250, discountPercent: 12 },
      { minSeats: 500, discountPercent: 18 }
    ],
    quotas: [
      { metric: "ai_tokens", included: 250_000_000, overageCents: 2, unitLabel: "1k tokens" },
      { metric: "compute_minutes", included: 40_000, overageCents: 9, unitLabel: "minute" },
      { metric: "reproducibility_runs", included: 2_000, overageCents: 425, unitLabel: "run" },
      { metric: "storage_gb", included: 25_000, overageCents: 10, unitLabel: "GB" },
      { metric: "licensing_api_calls", included: 250_000, overageCents: 1, unitLabel: "100 calls" }
    ],
    features: [
      { key: "private_projects", label: "Private projects", included: true },
      { key: "project_analytics", label: "Project analytics", included: true },
      { key: "group_permissions", label: "Group permissions", included: true },
      { key: "priority_support", label: "Priority support", included: true },
      { key: "sla", label: "Custom SLA", included: true },
      { key: "licensing_api", label: "Licensing API", included: true }
    ]
  }
]

export const coupons: Coupon[] = [
  {
    code: "OPENSCIENCE20",
    percentOff: 20,
    appliesTo: ["subscription"],
    expiresAt: "2027-01-01T00:00:00.000Z",
    maxRedemptions: 500,
    redeemed: 38
  },
  {
    code: "CONSORTIUM10",
    percentOff: 10,
    appliesTo: ["subscription", "data_licensing"],
    expiresAt: "2027-06-01T00:00:00.000Z",
    maxRedemptions: 50,
    redeemed: 7
  }
]

export const accounts: Account[] = [
  {
    id: "acct_individual_ada",
    name: "Ada Chen",
    kind: "individual",
    billingEmail: "ada@example.edu",
    country: "US",
    subscription: {
      planId: "individual-pro",
      interval: "monthly",
      seats: 1,
      startedAt: "2026-04-01T00:00:00.000Z",
      couponCode: "OPENSCIENCE20",
      paymentProvider: "stripe"
    },
    topUps: [
      {
        id: "topup_ada_001",
        accountId: "acct_individual_ada",
        stream: "ai_compute",
        amount: { currency: "USD", cents: 5000 },
        purchasedAt: "2026-04-12T00:00:00.000Z",
        consumedCents: 1800
      }
    ],
    usageEvents: [
      {
        id: "use_ada_tokens",
        accountId: "acct_individual_ada",
        metric: "ai_tokens",
        quantity: 1_450_000,
        occurredAt: "2026-05-03T09:00:00.000Z",
        source: "literature-review-agent"
      },
      {
        id: "use_ada_runs",
        accountId: "acct_individual_ada",
        metric: "reproducibility_runs",
        quantity: 5,
        occurredAt: "2026-05-04T11:00:00.000Z",
        source: "reproducibility-checker"
      }
    ]
  },
  {
    id: "acct_lab_quantum",
    name: "Quantum Materials Lab",
    kind: "lab",
    billingEmail: "billing@quantum-lab.example",
    country: "DE",
    institution: "NRW Institute of Materials",
    subscription: {
      planId: "lab-team",
      interval: "annual",
      seats: 18,
      startedAt: "2026-01-15T00:00:00.000Z",
      paymentProvider: "paypal"
    },
    topUps: [],
    usageEvents: [
      {
        id: "use_lab_compute",
        accountId: "acct_lab_quantum",
        metric: "compute_minutes",
        quantity: 2_100,
        occurredAt: "2026-05-06T14:00:00.000Z",
        source: "model-training"
      },
      {
        id: "use_lab_storage",
        accountId: "acct_lab_quantum",
        metric: "storage_gb",
        quantity: 1_250,
        occurredAt: "2026-05-07T08:00:00.000Z",
        source: "dataset-hosting"
      }
    ]
  },
  {
    id: "acct_institution_eu",
    name: "European Open Science Consortium",
    kind: "institution",
    billingEmail: "procurement@eosc.example",
    country: "BE",
    institution: "European Open Science Consortium",
    subscription: {
      planId: "institution-enterprise",
      interval: "annual",
      seats: 320,
      startedAt: "2026-02-01T00:00:00.000Z",
      couponCode: "CONSORTIUM10",
      paymentProvider: "institutional_invoice"
    },
    topUps: [],
    usageEvents: [
      {
        id: "use_eu_api",
        accountId: "acct_institution_eu",
        metric: "licensing_api_calls",
        quantity: 380_000,
        occurredAt: "2026-05-08T10:30:00.000Z",
        source: "policy-dashboard"
      }
    ]
  }
]

export const licensingContracts: LicensingContract[] = [
  {
    id: "lic_eu_001",
    accountId: "acct_institution_eu",
    customerName: "European Open Science Consortium",
    product: "trend_dashboard",
    annualFeeCents: 1800000,
    apiCallAllowance: 500_000,
    startedAt: "2026-02-01T00:00:00.000Z",
    expiresAt: "2027-02-01T00:00:00.000Z",
    accessScope: ["topic_trends", "method_usage", "reproducibility_scores"]
  },
  {
    id: "lic_policy_002",
    accountId: "acct_institution_eu",
    customerName: "National Research Policy Office",
    product: "citation_graph_api",
    annualFeeCents: 950000,
    apiCallAllowance: 250_000,
    startedAt: "2026-03-01T00:00:00.000Z",
    expiresAt: "2027-03-01T00:00:00.000Z",
    accessScope: ["citation_networks", "dataset_reuse"]
  }
]

export const researchMetadataEvents: ResearchMetadataEvent[] = [
  {
    id: "meta_001",
    projectId: "proj_climate_001",
    domain: "climate",
    method: "bayesian_modeling",
    region: "EU",
    institutionType: "university",
    reproducibilityScore: 0.91,
    citationCount: 38,
    datasetReuseCount: 11,
    occurredAt: "2026-05-01T00:00:00.000Z",
    containsPrivateContent: false
  },
  {
    id: "meta_002",
    projectId: "proj_bio_002",
    domain: "biology",
    method: "single_cell_analysis",
    region: "US",
    institutionType: "private_lab",
    reproducibilityScore: 0.74,
    citationCount: 12,
    datasetReuseCount: 5,
    occurredAt: "2026-05-03T00:00:00.000Z",
    containsPrivateContent: false
  },
  {
    id: "meta_003",
    projectId: "proj_private_003",
    domain: "medicine",
    method: "clinical_trial",
    region: "US",
    institutionType: "university",
    reproducibilityScore: 0.83,
    citationCount: 6,
    datasetReuseCount: 1,
    occurredAt: "2026-05-05T00:00:00.000Z",
    containsPrivateContent: true
  },
  {
    id: "meta_004",
    projectId: "proj_quantum_004",
    domain: "physics",
    method: "quantum_simulation",
    region: "DE",
    institutionType: "government",
    reproducibilityScore: 0.88,
    citationCount: 27,
    datasetReuseCount: 8,
    occurredAt: "2026-05-06T00:00:00.000Z",
    containsPrivateContent: false
  }
]
