const { buildPortfolioGuard } = require("./index")

const accounts = [
  {
    id: "lab-healthy",
    plan: "lab",
    monthlyRecurringRevenueUsd: 1200,
    computeBudgetUsd: 800,
    computeSpendUsd: 620,
    licensingExports: [
      {
        id: "reuse-trends-q2",
        valueUsd: 2200,
        anonymized: true,
        consentCoverage: 0.99,
        aggregationThreshold: 40,
      },
    ],
  },
  {
    id: "institute-disputed",
    plan: "institution",
    monthlyRecurringRevenueUsd: 9000,
    openDisputes: 2,
    chargebacksLostLast180d: 2,
    averageDisputeValueUsd: 4200,
    openInvoiceBalanceUsd: 18000,
    invoiceDaysPastDue: 45,
    paymentFailuresLast30d: 4,
    computeBudgetUsd: 12000,
    computeSpendUsd: 24000,
    topupPurchasesLast24h: 4,
    topupValueLast24hUsd: 6000,
    licensingExports: [
      {
        id: "national-reuse-api",
        valueUsd: 12500,
        anonymized: true,
        consentCoverage: 0.91,
        aggregationThreshold: 8,
      },
    ],
  },
  {
    id: "startup-topups",
    plan: "pro",
    monthlyRecurringRevenueUsd: 300,
    paymentFailuresLast30d: 1,
    computeBudgetUsd: 400,
    computeSpendUsd: 980,
    topupPurchasesLast24h: 5,
    topupValueLast24hUsd: 700,
    licensingExports: [],
  },
]

const packet = buildPortfolioGuard(accounts, { generatedFor: "monthly_close_packet" })

console.log("Revenue dispute guard")
console.log(JSON.stringify(packet, null, 2))
