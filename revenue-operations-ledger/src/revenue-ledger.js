const PLAN_CATALOG = Object.freeze({
  individual_pro: {
    name: "Individual Pro",
    monthlyUsd: 29,
    annualDiscountPct: 15,
    includedAiCredits: 1200,
    includedComputeHours: 10,
    privateProjects: 5,
    supportTier: "community"
  },
  lab: {
    name: "Lab",
    monthlyUsd: 249,
    annualDiscountPct: 18,
    includedAiCredits: 18000,
    includedComputeHours: 140,
    privateProjects: 80,
    supportTier: "priority"
  },
  institution: {
    name: "Institution",
    monthlyUsd: 2400,
    annualDiscountPct: 22,
    includedAiCredits: 250000,
    includedComputeHours: 2400,
    privateProjects: 1000,
    supportTier: "sla"
  }
});

const RATE_CARD = Object.freeze({
  aiInferenceCreditUsd: 0.008,
  reproducibilityComputeHourUsd: 4.5,
  storageGbMonthUsd: 0.18,
  licensingApiSeatUsd: 120
});

const COUPONS = Object.freeze({
  OPEN_SCIENCE_20: { pct: 20, appliesTo: ["individual_pro", "lab"] },
  CONSORTIUM_12: { pct: 12, appliesTo: ["institution"] }
});

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function requireKnownPlan(planId) {
  const plan = PLAN_CATALOG[planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${planId}`);
  }
  return plan;
}

export function quoteSubscription({
  planId,
  seats = 1,
  billingCycle = "monthly",
  couponCode,
  volumeDiscountPct = 0
}) {
  const plan = requireKnownPlan(planId);
  const months = billingCycle === "annual" ? 12 : 1;
  const annualDiscount = billingCycle === "annual" ? plan.annualDiscountPct : 0;
  const coupon = couponCode ? COUPONS[couponCode] : undefined;
  const couponPct =
    coupon && coupon.appliesTo.includes(planId) ? coupon.pct : 0;
  const subtotal = plan.monthlyUsd * seats * months;
  const totalDiscountPct = Math.min(
    70,
    annualDiscount + couponPct + volumeDiscountPct
  );
  const total = roundCurrency(subtotal * (1 - totalDiscountPct / 100));

  return {
    planId,
    planName: plan.name,
    seats,
    billingCycle,
    subtotalUsd: roundCurrency(subtotal),
    discounts: {
      annualDiscountPct: annualDiscount,
      couponCode: couponPct ? couponCode : null,
      couponPct,
      volumeDiscountPct
    },
    totalDiscountPct,
    totalUsd: total,
    included: {
      aiCredits: plan.includedAiCredits * seats,
      computeHours: plan.includedComputeHours * seats,
      privateProjects: plan.privateProjects,
      supportTier: plan.supportTier
    }
  };
}

export function meterUsage({ accountId, period, events }) {
  const totals = events.reduce(
    (acc, event) => {
      if (event.type === "ai_inference") {
        acc.aiCredits += event.credits;
        acc.aiSpendUsd += event.credits * RATE_CARD.aiInferenceCreditUsd;
      }
      if (event.type === "reproducibility_job") {
        acc.computeHours += event.hours;
        acc.computeSpendUsd +=
          event.hours * RATE_CARD.reproducibilityComputeHourUsd;
      }
      if (event.type === "storage") {
        acc.storageGbMonths += event.gbMonths;
        acc.storageSpendUsd += event.gbMonths * RATE_CARD.storageGbMonthUsd;
      }
      return acc;
    },
    {
      aiCredits: 0,
      aiSpendUsd: 0,
      computeHours: 0,
      computeSpendUsd: 0,
      storageGbMonths: 0,
      storageSpendUsd: 0
    }
  );

  return {
    accountId,
    period,
    eventCount: events.length,
    totals: {
      aiCredits: totals.aiCredits,
      computeHours: roundCurrency(totals.computeHours),
      storageGbMonths: roundCurrency(totals.storageGbMonths)
    },
    spendUsd: {
      aiInference: roundCurrency(totals.aiSpendUsd),
      reproducibilityCompute: roundCurrency(totals.computeSpendUsd),
      storage: roundCurrency(totals.storageSpendUsd),
      total: roundCurrency(
        totals.aiSpendUsd + totals.computeSpendUsd + totals.storageSpendUsd
      )
    }
  };
}

export function applyTopUps({ accountId, openingCredits, transactions }) {
  let balance = openingCredits;
  const ledger = transactions.map((transaction) => {
    const signedAmount =
      transaction.kind === "purchase" ? transaction.credits : -transaction.credits;
    balance += signedAmount;
    return {
      ...transaction,
      signedAmount,
      balanceAfter: balance
    };
  });

  return {
    accountId,
    openingCredits,
    closingCredits: balance,
    ledger
  };
}

export function decideEntitlements({ planId, seats, usage, topUpCredits = 0 }) {
  const plan = requireKnownPlan(planId);
  const includedAiCredits = plan.includedAiCredits * seats;
  const includedComputeHours = plan.includedComputeHours * seats;
  const aiCreditsAvailable = includedAiCredits + topUpCredits;

  return {
    planId,
    privateProjectsLimit: plan.privateProjects,
    supportTier: plan.supportTier,
    aiCredits: {
      used: usage.aiCredits,
      available: aiCreditsAvailable,
      remaining: aiCreditsAvailable - usage.aiCredits,
      overLimit: usage.aiCredits > aiCreditsAvailable
    },
    computeHours: {
      used: usage.computeHours,
      included: includedComputeHours,
      billableOverage: Math.max(0, roundCurrency(usage.computeHours - includedComputeHours))
    },
    actions: [
      usage.aiCredits > aiCreditsAvailable
        ? "require_credit_top_up_before_next_ai_job"
        : "allow_ai_jobs",
      usage.computeHours > includedComputeHours
        ? "invoice_compute_overage"
        : "compute_within_plan"
    ]
  };
}

export function packageAnalyticsLicense({
  customerId,
  seats,
  datasets,
  anonymizationLevel = "k_anonymity_10"
}) {
  const allowedDatasets = datasets.filter((dataset) => dataset.privateContent !== true);
  const deniedDatasets = datasets.filter((dataset) => dataset.privateContent === true);
  const monthlyUsd = roundCurrency(seats * RATE_CARD.licensingApiSeatUsd);

  return {
    customerId,
    product: "research_metadata_api",
    anonymizationLevel,
    monthlyUsd,
    allowedDatasets: allowedDatasets.map((dataset) => ({
      id: dataset.id,
      fields: dataset.fields,
      refreshCadence: dataset.refreshCadence
    })),
    deniedDatasetIds: deniedDatasets.map((dataset) => dataset.id),
    policy: "private_content_excluded"
  };
}

export function buildInstitutionalInvoice({
  institution,
  subscriptionQuote,
  usageInvoice,
  licensingPackage
}) {
  const lineItems = [
    {
      label: `${subscriptionQuote.planName} ${subscriptionQuote.billingCycle} subscription`,
      amountUsd: subscriptionQuote.totalUsd
    },
    {
      label: "AI compute and storage usage",
      amountUsd: usageInvoice.spendUsd.total
    },
    {
      label: "Anonymized analytics licensing",
      amountUsd: licensingPackage.monthlyUsd
    }
  ];
  const subtotalUsd = roundCurrency(
    lineItems.reduce((sum, item) => sum + item.amountUsd, 0)
  );

  return {
    invoiceId: `SCI-${institution.slug.toUpperCase()}-${usageInvoice.period}`,
    billTo: institution.name,
    period: usageInvoice.period,
    paymentRails: ["stripe", "paypal", "institutional_invoice"],
    lineItems,
    subtotalUsd,
    complianceNotes: [
      "Licensing package excludes private project content.",
      "Usage events are aggregated by account and period.",
      "Entitlement decisions can be replayed from the ledger inputs."
    ]
  };
}

export function summarizeRevenueHealth({ invoices }) {
  const totalInvoicedUsd = roundCurrency(
    invoices.reduce((sum, invoice) => sum + invoice.subtotalUsd, 0)
  );
  const byInstitution = invoices.map((invoice) => ({
    invoiceId: invoice.invoiceId,
    billTo: invoice.billTo,
    subtotalUsd: invoice.subtotalUsd,
    largestLineItem: invoice.lineItems.reduce((largest, item) =>
      item.amountUsd > largest.amountUsd ? item : largest
    )
  }));

  return {
    invoiceCount: invoices.length,
    totalInvoicedUsd,
    byInstitution,
    riskFlags: invoices.flatMap((invoice) =>
      invoice.subtotalUsd === 0 ? [`${invoice.invoiceId}: zero invoice`] : []
    )
  };
}

export const catalog = {
  plans: PLAN_CATALOG,
  rates: RATE_CARD,
  coupons: COUPONS
};
