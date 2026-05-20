const crypto = require("node:crypto")

const RISK_THRESHOLDS = [
  { tier: "critical", minScore: 0.8 },
  { tier: "high", minScore: 0.6 },
  { tier: "medium", minScore: 0.35 },
  { tier: "low", minScore: 0 },
]

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function digest(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex")
}

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max)
}

function roundCurrency(value) {
  return Number(value.toFixed(2))
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

function riskTier(score) {
  return RISK_THRESHOLDS.find((threshold) => score >= threshold.minScore).tier
}

function accountRiskFactors(account) {
  const computeBudget = account.computeBudgetUsd || 0
  const computeSpend = account.computeSpendUsd || 0
  const computeOverageRatio = computeBudget > 0 ? Math.max(computeSpend - computeBudget, 0) / computeBudget : 0
  const topupVelocityRatio =
    (account.monthlyRecurringRevenueUsd || 0) > 0
      ? (account.topupValueLast24hUsd || 0) / account.monthlyRecurringRevenueUsd
      : 0

  return [
    {
      id: "lost_chargebacks",
      label: "Lost chargebacks in the last 180 days",
      value: account.chargebacksLostLast180d || 0,
      score: clamp((account.chargebacksLostLast180d || 0) / 3),
      weight: 0.2,
    },
    {
      id: "open_disputes",
      label: "Open disputes",
      value: account.openDisputes || 0,
      score: clamp((account.openDisputes || 0) / 2),
      weight: 0.18,
    },
    {
      id: "payment_failures",
      label: "Failed payments in the last 30 days",
      value: account.paymentFailuresLast30d || 0,
      score: clamp((account.paymentFailuresLast30d || 0) / 4),
      weight: 0.16,
    },
    {
      id: "past_due",
      label: "Invoice days past due",
      value: account.invoiceDaysPastDue || 0,
      score: clamp((account.invoiceDaysPastDue || 0) / 45),
      weight: 0.14,
    },
    {
      id: "compute_overage",
      label: "AI compute overage ratio",
      value: Number(computeOverageRatio.toFixed(3)),
      score: clamp(computeOverageRatio / 0.75),
      weight: 0.14,
    },
    {
      id: "topup_velocity",
      label: "Top-up value in last 24h vs MRR",
      value: Number(topupVelocityRatio.toFixed(3)),
      score: clamp(topupVelocityRatio / 0.5),
      weight: 0.1,
    },
    {
      id: "licensing_export_risk",
      label: "Highest licensing export privacy risk",
      value: Math.max(...(account.licensingExports || []).map(licensingExportRiskScore), 0),
      score: Math.max(...(account.licensingExports || []).map(licensingExportRiskScore), 0),
      weight: 0.08,
    },
  ]
}

function scoreAccountRisk(account) {
  const factors = accountRiskFactors(account)
  return Number(sum(factors.map((factor) => factor.score * factor.weight)).toFixed(4))
}

function licensingExportRiskScore(exportItem) {
  const consentRisk = clamp((0.95 - (exportItem.consentCoverage || 0)) / 0.95)
  const aggregationRisk = clamp((10 - (exportItem.aggregationThreshold || 0)) / 10)
  const anonymizationRisk = exportItem.anonymized ? 0 : 1
  return Number((consentRisk * 0.35 + aggregationRisk * 0.3 + anonymizationRisk * 0.35).toFixed(4))
}

function reviewLicensingExports(account) {
  return (account.licensingExports || []).map((exportItem) => {
    const blockers = []
    if (!exportItem.anonymized) blockers.push("not_anonymized")
    if ((exportItem.consentCoverage || 0) < 0.95) blockers.push("consent_below_threshold")
    if ((exportItem.aggregationThreshold || 0) < 10) blockers.push("aggregation_threshold_too_low")

    return {
      id: exportItem.id,
      valueUsd: exportItem.valueUsd || 0,
      decision: blockers.length > 0 ? "hold" : "approve",
      blockers,
      riskScore: licensingExportRiskScore(exportItem),
    }
  })
}

function entitlementDecision(account, score) {
  if ((account.openDisputes || 0) > 0 && score >= 0.6) return "hold_paid_entitlements"
  if ((account.invoiceDaysPastDue || 0) >= 30) return "hold_new_usage"
  if ((account.computeSpendUsd || 0) > (account.computeBudgetUsd || 0) * 1.5) return "review_compute_usage"
  if ((account.paymentFailuresLast30d || 0) >= 2) return "require_payment_method_update"
  return "allow"
}

function reserveRecommendation(account, licensingReviews) {
  const disputedExposure = (account.openDisputes || 0) * (account.averageDisputeValueUsd || 0)
  const pastDueReserve =
    (account.invoiceDaysPastDue || 0) > 0 ? (account.openInvoiceBalanceUsd || 0) * 0.5 : 0
  const chargebackReserve = (account.chargebacksLostLast180d || 0) * (account.averageDisputeValueUsd || 0)
  const licensingReserve = sum(
    licensingReviews
      .filter((review) => review.decision === "hold")
      .map((review) => review.valueUsd * Math.max(review.riskScore, 0.25)),
  )

  return roundCurrency(disputedExposure + pastDueReserve + chargebackReserve + licensingReserve)
}

function recoveryActions(account, licensingReviews, score) {
  const actions = []
  if ((account.paymentFailuresLast30d || 0) > 0) actions.push("Send payment-method refresh notice.")
  if ((account.invoiceDaysPastDue || 0) >= 15) actions.push("Start institutional dunning sequence.")
  if ((account.openDisputes || 0) > 0) actions.push("Prepare dispute evidence packet before recognizing revenue.")
  if ((account.computeSpendUsd || 0) > (account.computeBudgetUsd || 0)) actions.push("Throttle AI compute overages until top-up clears.")
  if ((account.topupPurchasesLast24h || 0) >= 3) actions.push("Review rapid top-up pattern for abuse or card testing.")
  if (licensingReviews.some((review) => review.decision === "hold")) {
    actions.push("Hold analytics licensing export until privacy blockers clear.")
  }
  if (score >= 0.8) actions.push("Escalate account to finance risk review.")
  return actions
}

function revenueAdjustments(account, reserveUsd, licensingReviews) {
  const adjustments = []
  if (reserveUsd > 0) {
    adjustments.push({
      type: "reserve",
      amountUsd: reserveUsd,
      reason: "Dispute, past-due, chargeback, or licensing hold exposure.",
    })
  }
  if ((account.invoiceDaysPastDue || 0) >= 30) {
    adjustments.push({
      type: "defer_revenue",
      amountUsd: roundCurrency((account.openInvoiceBalanceUsd || 0) * 0.5),
      reason: "Invoice is 30+ days past due.",
    })
  }
  for (const review of licensingReviews.filter((item) => item.decision === "hold")) {
    adjustments.push({
      type: "hold_license_revenue",
      amountUsd: review.valueUsd,
      reason: `Licensing export ${review.id} has privacy blockers.`,
    })
  }
  return adjustments
}

function buildAccountGuard(account) {
  const score = scoreAccountRisk(account)
  const licensingReviews = reviewLicensingExports(account)
  const reserveUsd = reserveRecommendation(account, licensingReviews)
  const packet = {
    accountId: account.id,
    plan: account.plan,
    monthlyRecurringRevenueUsd: account.monthlyRecurringRevenueUsd || 0,
    riskScore: score,
    riskTier: riskTier(score),
    entitlementDecision: entitlementDecision(account, score),
    riskFactors: accountRiskFactors(account).map((factor) => ({
      id: factor.id,
      label: factor.label,
      value: factor.value,
      score: factor.score,
      weight: factor.weight,
    })),
    licensingReviews,
    reserveUsd,
    revenueAdjustments: revenueAdjustments(account, reserveUsd, licensingReviews),
    recoveryActions: recoveryActions(account, licensingReviews, score),
  }

  return {
    ...packet,
    auditDigest: digest(packet),
  }
}

function buildPortfolioGuard(accounts, options = {}) {
  const accountPackets = accounts.map(buildAccountGuard).sort((a, b) => b.riskScore - a.riskScore)
  const packet = {
    generatedFor: options.generatedFor || "finance_review",
    accountCount: accountPackets.length,
    heldAccounts: accountPackets.filter((account) => account.entitlementDecision !== "allow").length,
    totalMonthlyRecurringRevenueUsd: roundCurrency(sum(accountPackets.map((account) => account.monthlyRecurringRevenueUsd))),
    totalReserveUsd: roundCurrency(sum(accountPackets.map((account) => account.reserveUsd))),
    criticalAccounts: accountPackets.filter((account) => account.riskTier === "critical").map((account) => account.accountId),
    accounts: accountPackets,
  }

  return {
    ...packet,
    auditDigest: digest(accountPackets.map((account) => account.auditDigest)),
  }
}

module.exports = {
  buildAccountGuard,
  buildPortfolioGuard,
  digest,
  licensingExportRiskScore,
  scoreAccountRisk,
  stableJson,
}
