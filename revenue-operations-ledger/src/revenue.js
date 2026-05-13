const roundMoney = (value) => Math.round(value * 100) / 100;

export function buildPlanCatalog(planList) {
  return planList.map((plan) => ({
    ...plan,
    annualSavingsUsd: roundMoney(plan.monthlyUsd * 12 - plan.annualUsd),
    privateWorkflowEnabled: plan.features.includes("private-projects") || plan.features.includes("private-data-spaces"),
    enterpriseReady: plan.features.includes("saml") && plan.features.includes("sla")
  }));
}

export function calculateSeatPrice(plan, seats) {
  const extraSeats = Math.max(0, seats - plan.includedSeats);
  const baseExtraSeatUsd = plan.audience === "institution" ? 12 : plan.audience === "lab" ? 18 : 24;
  const volumeDiscount = extraSeats >= 50 ? 0.25 : extraSeats >= 10 ? 0.15 : 0;
  return {
    extraSeats,
    volumeDiscount,
    extraSeatMonthlyUsd: roundMoney(extraSeats * baseExtraSeatUsd * (1 - volumeDiscount))
  };
}

export function applyPromotion(amountUsd, promotion) {
  if (!promotion) return { discountUsd: 0, discountedAmountUsd: roundMoney(amountUsd), label: "none" };
  const discountUsd = promotion.type === "trial" ? amountUsd : roundMoney(amountUsd * (promotion.percentOff / 100));
  return {
    discountUsd,
    discountedAmountUsd: roundMoney(Math.max(0, amountUsd - discountUsd)),
    label: promotion.code ?? promotion.type
  };
}

export function priceSubscription(planList, customer) {
  const plan = planList.find((item) => item.id === customer.planId);
  if (!plan) throw new Error(`Unknown plan: ${customer.planId}`);
  const periodBase = customer.billingCycle === "annual" ? plan.annualUsd : plan.monthlyUsd;
  const seatPricing = calculateSeatPrice(plan, customer.seats);
  const seatCharge = customer.billingCycle === "annual" ? seatPricing.extraSeatMonthlyUsd * 12 : seatPricing.extraSeatMonthlyUsd;
  const subtotalUsd = roundMoney(periodBase + seatCharge);
  const promotion = applyPromotion(subtotalUsd, customer.promotion);
  return {
    planId: plan.id,
    billingCycle: customer.billingCycle,
    seats: customer.seats,
    subtotalUsd,
    discountUsd: promotion.discountUsd,
    totalBeforeTaxUsd: promotion.discountedAmountUsd,
    promotion: promotion.label,
    includedAiCredits: plan.includedAiCredits,
    features: plan.features
  };
}

export function meterComputeUsage(events) {
  const lines = events.map((event) => ({
    id: event.id,
    meter: event.meter,
    units: event.units,
    projectId: event.projectId,
    amountUsd: roundMoney(event.units * event.unitUsd)
  }));
  return {
    lines,
    totalUsageUsd: roundMoney(lines.reduce((total, line) => total + line.amountUsd, 0))
  };
}

export function applyTopUps(entitlements, topUps) {
  const addedCredits = topUps.reduce((total, topUp) => total + topUp.credits, 0);
  const amountUsd = topUps.reduce((total, topUp) => total + topUp.amountUsd, 0);
  return {
    ...entitlements,
    aiCredits: entitlements.aiCredits + addedCredits,
    topUpCredits: addedCredits,
    topUpAmountUsd: amountUsd
  };
}

export function buildEntitlements(planList, customer, topUps = []) {
  const plan = planList.find((item) => item.id === customer.planId);
  const base = {
    customerId: customer.id,
    seats: customer.seats,
    aiCredits: plan.includedAiCredits,
    features: new Set(plan.features),
    canCreatePrivateProjects: plan.features.includes("private-projects") || plan.features.includes("private-data-spaces"),
    prioritySupport: plan.features.includes("priority-support") || plan.features.includes("sla")
  };
  const withTopUps = applyTopUps(base, topUps);
  return { ...withTopUps, features: [...withTopUps.features].sort() };
}

export function buildPaymentIntent(customer, invoice) {
  const providerMap = {
    stripe: { provider: "stripe", collectionMethod: "card_or_ach", externalReference: `stripe_${invoice.id}` },
    paypal: { provider: "paypal", collectionMethod: "paypal_checkout", externalReference: `paypal_${invoice.id}` },
    "institutional-invoice": { provider: "institutional-invoice", collectionMethod: "net_30_invoice", externalReference: `invoice_${invoice.id}` }
  };
  return {
    customerId: customer.id,
    amountUsd: invoice.totalUsd,
    currency: "USD",
    ...(providerMap[customer.paymentProvider] ?? providerMap.stripe),
    liveChargeCreated: false
  };
}

export function buildInvoice({ id, planList, customer, usageEvents, topUps, analyticsLicense }) {
  const subscription = priceSubscription(planList, customer);
  const usage = meterComputeUsage(usageEvents);
  const topUpAmountUsd = topUps.reduce((total, topUp) => total + topUp.amountUsd, 0);
  const licensingUsd = analyticsLicense?.licenseUsd ?? 0;
  const taxableSubtotal = subscription.totalBeforeTaxUsd + usage.totalUsageUsd + topUpAmountUsd + licensingUsd;
  const taxUsd = roundMoney(taxableSubtotal * customer.taxRate);
  const totalUsd = roundMoney(taxableSubtotal + taxUsd);
  const invoice = {
    id,
    customerId: customer.id,
    lines: [
      { type: "subscription", amountUsd: subscription.totalBeforeTaxUsd, detail: subscription },
      { type: "usage", amountUsd: usage.totalUsageUsd, detail: usage.lines },
      { type: "top-up", amountUsd: topUpAmountUsd, detail: topUps },
      { type: "analytics-license", amountUsd: licensingUsd, detail: analyticsLicense?.id ?? null },
      { type: "tax", amountUsd: taxUsd, detail: { rate: customer.taxRate } }
    ],
    totalUsd
  };
  return {
    ...invoice,
    paymentIntent: buildPaymentIntent(customer, invoice)
  };
}

export function buildAnalyticsLicenseExport(dataset) {
  return {
    id: dataset.id,
    customerType: dataset.customerType,
    rows: dataset.rows,
    fields: dataset.fields,
    excludedFields: dataset.excludedFields,
    containsPrivateContent: dataset.fields.some((field) => dataset.excludedFields.includes(field)),
    licenseUsd: dataset.licenseUsd
  };
}

export function buildRevenueReport({ planList, customer, usageEvents, topUps, analyticsLicense }) {
  const subscription = priceSubscription(planList, customer);
  const usage = meterComputeUsage(usageEvents);
  const entitlements = buildEntitlements(planList, customer, topUps);
  const analyticsExport = buildAnalyticsLicenseExport(analyticsLicense);
  const invoice = buildInvoice({
    id: "inv-2026-05",
    planList,
    customer,
    usageEvents,
    topUps,
    analyticsLicense: analyticsExport
  });
  return {
    subscription,
    usage,
    entitlements,
    analyticsExport,
    invoice,
    health: {
      recurringUsd: subscription.totalBeforeTaxUsd,
      usageUsd: usage.totalUsageUsd,
      topUpUsd: entitlements.topUpAmountUsd,
      licensingUsd: analyticsExport.licenseUsd,
      totalInvoiceUsd: invoice.totalUsd
    }
  };
}
