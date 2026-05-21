const policy = {
  maxOutstandingInvoiceCents: 5000,
  maxInvoiceAgeDays: 30,
  minCreditExpiryDays: 45,
  defaultConsortiumDiscountRate: 0.18,
}

const transferRequests = [
  {
    id: "TR-OK-001",
    title: "Lab account transfer to central university tenant",
    sourceOrg: {
      id: "org-neuro-lab",
      name: "North Campus Neuro Lab",
      ssoDomain: "north.example.edu",
      plan: "institutional-lab",
      monthlySubscriptionCents: 240000,
      billingPeriodStart: "2026-05-01",
      billingPeriodEnd: "2026-05-31",
      discount: { type: "consortium", rate: 0.15 },
    },
    targetOrg: {
      id: "org-north-central",
      name: "North Example University",
      ssoDomain: "north.example.edu",
      plan: "institutional-enterprise",
      monthlySubscriptionCents: 300000,
      consortium: { active: true, rosterMatch: true, maxDiscountRate: 0.18 },
    },
    effectiveDate: "2026-05-16",
    invoices: [
      { id: "INV-100", status: "paid", ageDays: 3, amountCents: 240000 },
    ],
    purchaseOrder: {
      id: "PO-2026-17",
      transferAuthorized: true,
      budgetOwnerApproved: true,
    },
    identity: {
      domainClaimVerified: true,
      adminSignoff: true,
    },
    analyticsLicense: {
      id: "LIC-RESEARCH-17",
      scopeTransferable: true,
      permittedScopes: ["noncommercial-research", "campus-analytics"],
      requestedScope: "campus-analytics",
      dpaInPlace: true,
    },
    computeCredits: [
      {
        id: "CC-900",
        ownerOrgId: "org-neuro-lab",
        remainingCredits: 4200,
        transferable: true,
        expiresAt: "2026-09-30",
      },
    ],
  },
  {
    id: "TR-HOLD-002",
    title: "Transfer from grant lab to commercial spinout",
    sourceOrg: {
      id: "org-grant-lab",
      name: "Genome Grant Lab",
      ssoDomain: "grant.example.edu",
      plan: "institutional-lab",
      monthlySubscriptionCents: 180000,
      billingPeriodStart: "2026-05-01",
      billingPeriodEnd: "2026-05-31",
      discount: { type: "grant", rate: 0.25 },
    },
    targetOrg: {
      id: "org-spinout",
      name: "Genome Spinout Inc",
      ssoDomain: "spinout.example.com",
      plan: "commercial-team",
      monthlySubscriptionCents: 260000,
      consortium: { active: false, rosterMatch: false, maxDiscountRate: 0 },
    },
    effectiveDate: "2026-05-20",
    invoices: [
      { id: "INV-201", status: "overdue", ageDays: 49, amountCents: 82000 },
    ],
    purchaseOrder: {
      id: "PO-2026-44",
      transferAuthorized: false,
      budgetOwnerApproved: false,
    },
    identity: {
      domainClaimVerified: false,
      adminSignoff: false,
    },
    analyticsLicense: {
      id: "LIC-GRANT-08",
      scopeTransferable: false,
      permittedScopes: ["noncommercial-research"],
      requestedScope: "commercial-analytics",
      dpaInPlace: false,
    },
    computeCredits: [
      {
        id: "CC-204",
        ownerOrgId: "org-grant-lab",
        remainingCredits: 3000,
        transferable: false,
        expiresAt: "2026-10-01",
      },
    ],
  },
  {
    id: "TR-COND-003",
    title: "Consortium member transfer with discount reset",
    sourceOrg: {
      id: "org-consortium-a",
      name: "Eastern Bioinformatics Center",
      ssoDomain: "east.example.edu",
      plan: "institutional-lab",
      monthlySubscriptionCents: 160000,
      billingPeriodStart: "2026-05-01",
      billingPeriodEnd: "2026-05-31",
      discount: { type: "consortium", rate: 0.25 },
    },
    targetOrg: {
      id: "org-consortium-b",
      name: "Metro Research Hospital",
      ssoDomain: "metro.example.org",
      plan: "institutional-lab",
      monthlySubscriptionCents: 180000,
      consortium: { active: true, rosterMatch: true, maxDiscountRate: 0.12 },
    },
    effectiveDate: "2026-05-22",
    invoices: [
      { id: "INV-310", status: "paid", ageDays: 10, amountCents: 160000 },
    ],
    purchaseOrder: {
      id: "PO-2026-88",
      transferAuthorized: true,
      budgetOwnerApproved: true,
    },
    identity: {
      domainClaimVerified: true,
      adminSignoff: true,
    },
    analyticsLicense: {
      id: "LIC-META-77",
      scopeTransferable: true,
      permittedScopes: ["noncommercial-research", "clinical-quality"],
      requestedScope: "clinical-quality",
      dpaInPlace: true,
    },
    computeCredits: [
      {
        id: "CC-330",
        ownerOrgId: "org-consortium-a",
        remainingCredits: 850,
        transferable: true,
        expiresAt: "2026-06-10",
      },
    ],
  },
  {
    id: "TR-HOLD-004",
    title: "Compute-credit grant ownership mismatch",
    sourceOrg: {
      id: "org-micro-lab",
      name: "Microbiome Methods Lab",
      ssoDomain: "micro.example.edu",
      plan: "institutional-lab",
      monthlySubscriptionCents: 150000,
      billingPeriodStart: "2026-05-01",
      billingPeriodEnd: "2026-05-31",
      discount: { type: "standard", rate: 0.1 },
    },
    targetOrg: {
      id: "org-shared-core",
      name: "Shared Core Facility",
      ssoDomain: "core.example.edu",
      plan: "institutional-lab",
      monthlySubscriptionCents: 150000,
      consortium: { active: true, rosterMatch: true, maxDiscountRate: 0.1 },
    },
    effectiveDate: "2026-05-12",
    invoices: [
      { id: "INV-411", status: "paid", ageDays: 2, amountCents: 150000 },
    ],
    purchaseOrder: {
      id: "PO-2026-91",
      transferAuthorized: true,
      budgetOwnerApproved: true,
    },
    identity: {
      domainClaimVerified: true,
      adminSignoff: true,
    },
    analyticsLicense: {
      id: "LIC-OPEN-12",
      scopeTransferable: true,
      permittedScopes: ["noncommercial-research"],
      requestedScope: "noncommercial-research",
      dpaInPlace: true,
    },
    computeCredits: [
      {
        id: "CC-512",
        ownerOrgId: "grant-funder-nih",
        remainingCredits: 6400,
        transferable: true,
        expiresAt: "2026-12-31",
      },
    ],
  },
]

module.exports = {
  policy,
  transferRequests,
}
