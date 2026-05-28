const pricingCatalog = {
  currency: "USD",
  plans: {
    individualPro: {
      id: "individualPro",
      name: "Individual Pro",
      monthlyCents: 2900,
      annualCents: 29000,
      extraSeatCents: 0,
      requiresContract: false,
      included: {
        seats: 1,
        aiTokens: 250000,
        computeHours: 5,
        storageGb: 20,
        apiCalls: 0,
      },
    },
    lab: {
      id: "lab",
      name: "Research Lab",
      monthlyCents: 24900,
      annualCents: 249000,
      extraSeatCents: 1200,
      requiresContract: false,
      included: {
        seats: 10,
        aiTokens: 2000000,
        computeHours: 40,
        storageGb: 500,
        apiCalls: 10000,
      },
    },
    institution: {
      id: "institution",
      name: "Institution",
      monthlyCents: 199900,
      annualCents: 1999000,
      extraSeatCents: 800,
      requiresContract: true,
      included: {
        seats: 100,
        aiTokens: 25000000,
        computeHours: 800,
        storageGb: 5000,
        apiCalls: 250000,
      },
    },
  },
  usageRates: {
    aiTokenPerThousandCents: 4,
    computeHourCents: 240,
    storageGbCents: 12,
    apiCallPerThousandCents: 3,
  },
  licensing: {
    analyticsAccessCents: 75000,
    apiPackageCents: 50000,
  },
};

const reviewContext = {
  reviewDate: "2026-05-28T00:00:00Z",
  taxRequiredCountries: ["US", "CA", "GB", "DE", "FR"],
  usageSpikeMultiplier: 3,
};

const riskyLabAccount = {
  id: "lab-nova-omics",
  organizationName: "Nova Omics Lab",
  planId: "lab",
  billingCycle: "monthly",
  seats: 18,
  budgetCapCents: 45000,
  billingProfile: {
    country: "US",
    taxId: "",
    invoiceEmail: "",
  },
  paymentProvider: {
    mode: "stripe",
    customerId: "",
    defaultPaymentMethod: "",
  },
  usage: {
    aiTokens: 3600000,
    computeHours: 120,
    storageGb: 850,
    apiCalls: 25000,
  },
  previousUsage: {
    aiTokens: 800000,
    computeHours: 18,
    storageGb: 420,
    apiCalls: 4000,
  },
  usageAttestation: {
    computeApproved: false,
  },
  licensing: {
    enabled: true,
    exportMode: "project-level",
    includesPrivateContent: true,
    dataProcessingAgreementId: "",
    apiPackage: "policy-dashboard",
  },
  discounts: [
    { code: "OPEN-SCIENCE-PILOT", percentOff: 0.1 },
  ],
};

const readyInstitutionAccount = {
  id: "inst-midwest-research",
  organizationName: "Midwest Research Consortium",
  planId: "institution",
  billingCycle: "annual",
  seats: 130,
  budgetCapCents: 2600000,
  contract: {
    signedAt: "2026-05-01T15:45:00Z",
  },
  billingProfile: {
    country: "US",
    taxId: "US-12-3456789",
    invoiceEmail: "ap@example.edu",
    purchaseOrder: "PO-2026-SCIBASE-0042",
  },
  paymentProvider: {
    mode: "invoice",
    customerId: "cus_synthetic_midwest",
    defaultPaymentMethod: "",
  },
  usage: {
    aiTokens: 26000000,
    computeHours: 875,
    storageGb: 5400,
    apiCalls: 260000,
  },
  previousUsage: {
    aiTokens: 24000000,
    computeHours: 760,
    storageGb: 5000,
    apiCalls: 245000,
  },
  usageAttestation: {
    computeApproved: true,
  },
  licensing: {
    enabled: true,
    exportMode: "aggregate-anonymized",
    includesPrivateContent: false,
    dataProcessingAgreementId: "DPA-2026-051",
    apiPackage: "policy-dashboard",
  },
  discounts: [
    { code: "ANNUAL-RESEARCH-CONSORTIUM", amountUsd: 2500 },
  ],
};

module.exports = {
  pricingCatalog,
  readyInstitutionAccount,
  reviewContext,
  riskyLabAccount,
};
