import crypto from "node:crypto"

const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100
const pct = (value) => Math.round((value + Number.EPSILON) * 10) / 10

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable)
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

export function auditDigest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex")
}

function costForJob(job, sku, overheadPct) {
  const tokenCost = ((job.inputTokens || 0) / 1_000_000) * sku.inputPerMillionUsd
    + ((job.outputTokens || 0) / 1_000_000) * sku.outputPerMillionUsd
  const gpuCost = ((job.gpuSeconds || 0) / 3600) * sku.gpuHourUsd
  const storageCost = ((job.storageGbDays || 0) / 30) * sku.storageGbMonthUsd
  const reproCost = (job.reproRuns || 0) * sku.reproRunUsd
  const directCost = tokenCost + gpuCost + storageCost + reproCost
  return money(directCost * (1 + overheadPct / 100))
}

function billableRevenueForJob(job, priceBook) {
  const price = priceBook.find((entry) => entry.capability === job.capability)
  if (!price) {
    return 0
  }
  if (price.unit === "one-thousand-output-tokens") {
    return money(((job.outputTokens || 0) / 1000) * price.unitPriceUsd)
  }
  if (price.unit === "gpu-hour") {
    return money(((job.gpuSeconds || 0) / 3600) * price.unitPriceUsd)
  }
  if (price.unit === "run") {
    return money((job.reproRuns || 0) * price.unitPriceUsd)
  }
  return 0
}

function cheaperRoute(job, currentSku, providerSkus) {
  const currentHourly = currentSku.gpuHourUsd + currentSku.reproRunUsd
  const compatible = providerSkus
    .filter((sku) => sku.id !== currentSku.id && sku.capabilities.includes(job.capability))
    .map((sku) => ({ sku, comparableCost: sku.gpuHourUsd + sku.reproRunUsd }))
    .sort((a, b) => a.comparableCost - b.comparableCost)

  if (compatible.length === 0 || compatible[0].comparableCost >= currentHourly) {
    return null
  }

  return {
    jobId: job.id,
    fromSku: currentSku.id,
    toSku: compatible[0].sku.id,
    reason: "cheaper-compatible-provider-sku",
    estimatedHourlyDeltaUsd: money(currentHourly - compatible[0].comparableCost)
  }
}

export function evaluateComputeMargins(workspace, options = {}) {
  const policy = { ...workspace.marginPolicy, ...options.marginPolicy }
  const providerSkus = workspace.providerSkus || []
  const priceBook = workspace.priceBook || []
  const jobsByAccount = new Map()
  const unknownSkuJobs = []
  const routeRecommendations = []

  for (const job of workspace.jobs || []) {
    if (!jobsByAccount.has(job.accountId)) {
      jobsByAccount.set(job.accountId, [])
    }
    jobsByAccount.get(job.accountId).push(job)
  }

  const accounts = (workspace.accounts || []).map((account) => {
    const plan = (workspace.plans || []).find((candidate) => candidate.id === account.planId)
    const jobs = jobsByAccount.get(account.id) || []
    const jobBreakdown = []

    for (const job of jobs) {
      const sku = providerSkus.find((candidate) => candidate.id === job.providerSkuId)
      if (!sku) {
        unknownSkuJobs.push(job.id)
        jobBreakdown.push({
          jobId: job.id,
          capability: job.capability,
          providerSkuId: job.providerSkuId,
          costUsd: null,
          billableRevenueUsd: billableRevenueForJob(job, priceBook),
          holdReasons: ["unknown-provider-sku"]
        })
        continue
      }

      const routing = cheaperRoute(job, sku, providerSkus)
      if (routing) {
        routeRecommendations.push(routing)
      }

      jobBreakdown.push({
        jobId: job.id,
        capability: job.capability,
        providerSkuId: job.providerSkuId,
        costUsd: costForJob(job, sku, policy.overheadPct),
        billableRevenueUsd: billableRevenueForJob(job, priceBook),
        holdReasons: []
      })
    }

    const knownCostUsd = money(jobBreakdown.reduce((sum, job) => sum + (job.costUsd || 0), 0))
    const meteredRevenueUsd = money(jobBreakdown.reduce((sum, job) => sum + job.billableRevenueUsd, 0))
    const paidTopUpsUsd = money((account.topUps || []).filter((topUp) => topUp.paid).reduce((sum, topUp) => sum + topUp.amountUsd, 0))
    const unpaidTopUpsUsd = money((account.topUps || []).filter((topUp) => !topUp.paid).reduce((sum, topUp) => sum + topUp.amountUsd, 0))
    const recognizedRevenueUsd = money(account.recognizedComputeRevenueUsd + paidTopUpsUsd)
    const grossMarginPct = recognizedRevenueUsd > 0 ? pct(((recognizedRevenueUsd - knownCostUsd) / recognizedRevenueUsd) * 100) : 0
    const requiredMarginPct = account.accountType === "enterprise" ? policy.enterpriseFloorPct : policy.defaultFloorPct
    const quotaBurnPct = plan?.includedComputeCreditUsd ? pct((meteredRevenueUsd / plan.includedComputeCreditUsd) * 100) : 0
    const grantSpendPct = account.grantBudget?.limitUsd ? pct(((account.grantBudget.spentUsd + knownCostUsd) / account.grantBudget.limitUsd) * 100) : 0
    const topUpMarginPct = paidTopUpsUsd > 0 ? pct(((paidTopUpsUsd - knownCostUsd) / paidTopUpsUsd) * 100) : null

    const holdReasons = []
    if (grossMarginPct < requiredMarginPct) {
      holdReasons.push("gross-margin-below-floor")
    }
    if (quotaBurnPct >= policy.quotaBurnWarningPct) {
      holdReasons.push("quota-burn-warning")
    }
    if (grantSpendPct >= policy.grantBudgetWarningPct) {
      holdReasons.push("grant-budget-warning")
    }
    if (unpaidTopUpsUsd > 0) {
      holdReasons.push("unpaid-top-up-balance")
    }
    if (topUpMarginPct !== null && topUpMarginPct < policy.minTopUpMarginPct) {
      holdReasons.push("top-up-price-below-margin-floor")
    }
    if (jobBreakdown.some((job) => job.holdReasons.includes("unknown-provider-sku"))) {
      holdReasons.push("unknown-provider-sku")
    }

    const summary = {
      accountId: account.id,
      name: account.name,
      planId: account.planId,
      knownCostUsd,
      meteredRevenueUsd,
      recognizedRevenueUsd,
      unpaidTopUpsUsd,
      grossMarginPct,
      requiredMarginPct,
      quotaBurnPct,
      grantSpendPct,
      status: holdReasons.length ? "hold" : "clear",
      holdReasons,
      jobBreakdown
    }

    return {
      ...summary,
      auditDigest: auditDigest(summary)
    }
  })

  const totalRevenueUsd = money(accounts.reduce((sum, account) => sum + account.recognizedRevenueUsd, 0))
  const totalKnownCostUsd = money(accounts.reduce((sum, account) => sum + account.knownCostUsd, 0))
  const totalGrossMarginPct = totalRevenueUsd > 0 ? pct(((totalRevenueUsd - totalKnownCostUsd) / totalRevenueUsd) * 100) : 0

  const report = {
    asOfDate: workspace.asOfDate,
    totals: {
      accountCount: accounts.length,
      holdCount: accounts.filter((account) => account.status === "hold").length,
      totalRevenueUsd,
      totalKnownCostUsd,
      totalGrossMarginPct,
      unknownSkuCount: unknownSkuJobs.length
    },
    accounts,
    routeRecommendations,
    pricingFloorNotes: buildPricingFloorNotes(priceBook, providerSkus, policy),
    reviewerChecklist: [
      "Review held accounts before approving more AI compute usage.",
      "Route reproducibility jobs to the cheapest compatible SKU when quality allows.",
      "Raise top-up package prices when gross margin falls below policy floor.",
      "Resolve unknown provider SKUs before closing institutional invoices."
    ]
  }

  return {
    ...report,
    auditDigest: auditDigest(report)
  }
}

function buildPricingFloorNotes(priceBook, providerSkus, policy) {
  return priceBook.map((price) => {
    const compatibleSkus = providerSkus.filter((sku) => sku.capabilities.includes(price.capability))
    const cheapestCost = compatibleSkus.length
      ? Math.min(...compatibleSkus.map((sku) => sku.gpuHourUsd || sku.reproRunUsd || sku.outputPerMillionUsd / 1000 || 0))
      : 0
    return {
      capability: price.capability,
      currentUnitPriceUsd: price.unitPriceUsd,
      unit: price.unit,
      cheapestCompatibleCostSignalUsd: money(cheapestCost),
      minTopUpMarginPct: policy.minTopUpMarginPct
    }
  })
}
