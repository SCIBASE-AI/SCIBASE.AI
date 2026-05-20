const assert = require("node:assert/strict")
const {
  buildAccountGuard,
  buildPortfolioGuard,
  digest,
  licensingExportRiskScore,
  scoreAccountRisk,
} = require("./index")

function healthyAccount() {
  return {
    id: "healthy",
    plan: "lab",
    monthlyRecurringRevenueUsd: 1000,
    computeBudgetUsd: 800,
    computeSpendUsd: 500,
    licensingExports: [
      {
        id: "safe-export",
        valueUsd: 1200,
        anonymized: true,
        consentCoverage: 0.99,
        aggregationThreshold: 30,
      },
    ],
  }
}

function disputedAccount() {
  return {
    id: "disputed",
    plan: "institution",
    monthlyRecurringRevenueUsd: 5000,
    openDisputes: 2,
    chargebacksLostLast180d: 2,
    averageDisputeValueUsd: 2500,
    paymentFailuresLast30d: 4,
    invoiceDaysPastDue: 45,
    openInvoiceBalanceUsd: 10000,
    computeBudgetUsd: 2000,
    computeSpendUsd: 4100,
    topupPurchasesLast24h: 4,
    topupValueLast24hUsd: 4000,
    licensingExports: [
      {
        id: "unsafe-export",
        valueUsd: 3000,
        anonymized: false,
        consentCoverage: 0.8,
        aggregationThreshold: 4,
      },
    ],
  }
}

function testLowRiskAccountAllowsEntitlements() {
  const guard = buildAccountGuard(healthyAccount())

  assert.equal(guard.riskTier, "low")
  assert.equal(guard.entitlementDecision, "allow")
  assert.equal(guard.reserveUsd, 0)
  assert.equal(guard.licensingReviews[0].decision, "approve")
}

function testDisputedAccountIsHeldAndReserved() {
  const guard = buildAccountGuard(disputedAccount())

  assert.equal(guard.riskTier, "critical")
  assert.equal(guard.entitlementDecision, "hold_paid_entitlements")
  assert.ok(guard.reserveUsd > 12000)
  assert.ok(guard.recoveryActions.some((action) => action.includes("dispute evidence")))
}

function testTopupVelocityAddsAbuseReviewAction() {
  const guard = buildAccountGuard({
    ...healthyAccount(),
    id: "rapid-topup",
    monthlyRecurringRevenueUsd: 500,
    topupPurchasesLast24h: 5,
    topupValueLast24hUsd: 1000,
  })

  assert.ok(guard.riskFactors.find((factor) => factor.id === "topup_velocity").score > 0)
  assert.ok(guard.recoveryActions.some((action) => action.includes("rapid top-up")))
}

function testLicensingExportRiskBlocksUnsafeExports() {
  const risk = licensingExportRiskScore({
    anonymized: false,
    consentCoverage: 0.8,
    aggregationThreshold: 3,
  })
  const guard = buildAccountGuard(disputedAccount())

  assert.ok(risk > 0.6)
  assert.equal(guard.licensingReviews[0].decision, "hold")
  assert.ok(guard.licensingReviews[0].blockers.includes("not_anonymized"))
}

function testPortfolioTotalsAndSorting() {
  const portfolio = buildPortfolioGuard([healthyAccount(), disputedAccount()])

  assert.equal(portfolio.accountCount, 2)
  assert.equal(portfolio.heldAccounts, 1)
  assert.equal(portfolio.accounts[0].accountId, "disputed")
  assert.ok(portfolio.totalReserveUsd > 12000)
}

function testRiskAndDigestAreDeterministic() {
  const first = scoreAccountRisk(disputedAccount())
  const second = scoreAccountRisk({ ...disputedAccount() })

  assert.equal(first, second)
  assert.equal(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }))
}

const tests = [
  testLowRiskAccountAllowsEntitlements,
  testDisputedAccountIsHeldAndReserved,
  testTopupVelocityAddsAbuseReviewAction,
  testLicensingExportRiskBlocksUnsafeExports,
  testPortfolioTotalsAndSorting,
  testRiskAndDigestAreDeterministic,
]

for (const test of tests) {
  test()
  console.log(`ok - ${test.name}`)
}

console.log(`${tests.length} tests passed`)
