const BILLING_CYCLES = new Set(["monthly", "annual"]);

export function normalizeCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.plans) || catalog.plans.length === 0) {
    throw new Error("catalog.plans must include at least one plan");
  }

  const plans = catalog.plans.map((plan) => {
    if (!plan.id || !plan.name) throw new Error("each plan requires id and name");
    if (!BILLING_CYCLES.has(plan.billingCycle)) {
      throw new Error(`unsupported billing cycle for ${plan.id}`);
    }
    assertNumber(plan.basePrice, `${plan.id}.basePrice`);
    assertNumber(plan.includedSeats, `${plan.id}.includedSeats`);
    assertNumber(plan.extraSeatPrice, `${plan.id}.extraSeatPrice`);
    assertNumber(plan.includedAiCredits, `${plan.id}.includedAiCredits`);
    return {
      volumeDiscounts: [],
      entitlements: [],
      computeOverageRate: 0,
      ...plan,
    };
  });

  return {
    currency: "USD",
    trialDays: 0,
    couponRules: [],
    ...catalog,
    plans,
  };
}

export function quoteSubscription(catalogInput, account) {
  const catalog = normalizeCatalog(catalogInput);
  const plan = catalog.plans.find((candidate) => candidate.id === account.planId);
  if (!plan) throw new Error(`unknown plan: ${account.planId}`);

  const seats = account.seats ?? 1;
  const extraSeats = Math.max(0, seats - plan.includedSeats);
  const seatSubtotal = plan.basePrice + extraSeats * plan.extraSeatPrice;
  const volumeDiscount = findVolumeDiscount(plan.volumeDiscounts, seats);
  const couponDiscount = findCouponDiscount(catalog.couponRules, account.couponCode);
  const cycleMultiplier = plan.billingCycle === "annual" ? 12 : 1;
  const gross = seatSubtotal * cycleMultiplier;
  const discountAmount = gross * (volumeDiscount + couponDiscount);
  const trialCredit = account.inTrial ? gross - discountAmount : 0;
  const total = Math.max(0, gross - discountAmount - trialCredit);

  return {
    accountId: account.id,
    planId: plan.id,
    currency: catalog.currency,
    seats,
    includedSeats: plan.includedSeats,
    extraSeats,
    entitlements: plan.entitlements,
    includedAiCredits: plan.includedAiCredits,
    subtotal: roundCurrency(gross),
    discountRate: round(volumeDiscount + couponDiscount),
    discountAmount: roundCurrency(discountAmount),
    trialCredit: roundCurrency(trialCredit),
    total: roundCurrency(total),
  };
}

export function meterAiCompute(catalogInput, account, usage, topUps = []) {
  const catalog = normalizeCatalog(catalogInput);
  const plan = catalog.plans.find((candidate) => candidate.id === account.planId);
  if (!plan) throw new Error(`unknown plan: ${account.planId}`);

  const purchasedCredits = topUps
    .filter((topUp) => topUp.accountId === account.id)
    .reduce((sum, topUp) => sum + topUp.credits, 0);
  const consumed = usage.aiCredits || 0;
  const included = plan.includedAiCredits;
  const available = included + purchasedCredits;
  const overageCredits = Math.max(0, consumed - available);

  return {
    accountId: account.id,
    includedCredits: included,
    purchasedCredits,
    consumedCredits: consumed,
    remainingCredits: Math.max(0, available - consumed),
    overageCredits,
    overageCost: roundCurrency(overageCredits * plan.computeOverageRate),
    quotaStatus: overageCredits > 0 ? "over_quota" : consumed / Math.max(1, available) >= 0.85 ? "near_limit" : "healthy",
  };
}

export function buildInstitutionInvoice(catalogInput, account, usage, topUps = []) {
  const subscription = quoteSubscription(catalogInput, account);
  const compute = meterAiCompute(catalogInput, account, usage, topUps);
  const topUpLines = topUps
    .filter((topUp) => topUp.accountId === account.id)
    .map((topUp) => ({
      kind: "ai_credit_topup",
      description: `${topUp.credits} AI credits`,
      amount: roundCurrency(topUp.amount),
    }));
  const lines = [
    { kind: "subscription", description: `${subscription.planId} subscription`, amount: subscription.total },
    ...topUpLines,
    { kind: "compute_overage", description: `${compute.overageCredits} overage credits`, amount: compute.overageCost },
  ].filter((line) => line.amount > 0);

  return {
    invoiceId: `${account.id}:${usage.period}`,
    accountId: account.id,
    period: usage.period,
    currency: subscription.currency,
    lines,
    total: roundCurrency(lines.reduce((sum, line) => sum + line.amount, 0)),
    entitlements: subscription.entitlements,
    quotaStatus: compute.quotaStatus,
  };
}

export function prepareLicensingExport(exportRequest) {
  const allowedFields = new Set([
    "topic",
    "citationCount",
    "datasetReuseCount",
    "reproducibilityScore",
    "method",
    "year",
    "institutionRegion",
  ]);
  const fields = exportRequest.fields || [];
  const blockedFields = fields.filter((field) => !allowedFields.has(field));
  const anonymizedRows = (exportRequest.rows || []).map((row) => {
    const out = {};
    for (const field of fields) {
      if (allowedFields.has(field)) out[field] = row[field];
    }
    return out;
  });

  return {
    customerId: exportRequest.customerId,
    license: exportRequest.license || "analytics-api",
    ready: blockedFields.length === 0 && anonymizedRows.length >= (exportRequest.minimumRows || 1),
    blockedFields,
    rowCount: anonymizedRows.length,
    dataClassification: "anonymized_research_metadata_only",
    sample: anonymizedRows.slice(0, 2),
  };
}

export function revenueHealthSnapshot(catalogInput, accounts, usageByAccount, topUps = []) {
  const catalog = normalizeCatalog(catalogInput);
  const invoices = accounts.map((account) =>
    buildInstitutionInvoice(catalog, account, usageByAccount[account.id] || { period: "unknown", aiCredits: 0 }, topUps),
  );
  const monthlyRecurringRevenue = accounts.reduce((sum, account) => {
    const quote = quoteSubscription(catalog, { ...account, inTrial: false });
    return sum + (catalog.plans.find((plan) => plan.id === account.planId).billingCycle === "annual" ? quote.total / 12 : quote.total);
  }, 0);
  const quotaAlerts = invoices.filter((invoice) => invoice.quotaStatus !== "healthy").map((invoice) => ({
    accountId: invoice.accountId,
    quotaStatus: invoice.quotaStatus,
  }));

  return {
    accountCount: accounts.length,
    monthlyRecurringRevenue: roundCurrency(monthlyRecurringRevenue),
    annualRecurringRevenue: roundCurrency(monthlyRecurringRevenue * 12),
    invoiceTotal: roundCurrency(invoices.reduce((sum, invoice) => sum + invoice.total, 0)),
    quotaAlerts,
    invoices,
  };
}

function findVolumeDiscount(discounts, seats) {
  return (discounts || [])
    .filter((discount) => seats >= discount.minSeats)
    .sort((a, b) => b.minSeats - a.minSeats)[0]?.rate || 0;
}

function findCouponDiscount(couponRules, code) {
  return (couponRules || []).find((coupon) => coupon.code === code)?.rate || 0;
}

function assertNumber(value, label) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}
