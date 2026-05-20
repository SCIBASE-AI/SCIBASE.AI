const policy = {
  asOfDate: "2026-05-20",
  mrrVarianceWarnPct: 8,
  minimumSeatUtilizationPct: 70,
  renewalWindowDays: 60,
  computeCostVarianceWarnPct: 18,
  computeGrossMarginFloorPct: 62,
  quotaBurnWarnPct: 90,
  pipelineSlipGraceDays: 7,
  minimumLicensingCohortSize: 30,
};

const subscriptions = [
  {
    accountId: "university-alpha",
    plan: "institutional",
    forecastMrr: 9200,
    actualMrr: 9200,
    contractedSeats: 180,
    activeSeats: 151,
    renewalDate: "2026-07-28",
    renewalConfidence: 0.86,
  },
  {
    accountId: "lab-beta",
    plan: "research-group",
    forecastMrr: 4200,
    actualMrr: 3375,
    contractedSeats: 42,
    activeSeats: 22,
    renewalDate: "2026-06-18",
    renewalConfidence: 0.55,
  },
  {
    accountId: "researcher-gamma",
    plan: "pro",
    forecastMrr: 120,
    actualMrr: 120,
    contractedSeats: 1,
    activeSeats: 1,
    renewalDate: "2027-01-08",
    renewalConfidence: 0.93,
  },
];

const computeUsage = [
  {
    accountId: "university-alpha",
    workload: "reproducibility-checks",
    forecastRevenue: 1850,
    actualRevenue: 2260,
    forecastCost: 515,
    actualCost: 740,
    includedUnits: 400,
    actualUnits: 372,
  },
  {
    accountId: "lab-beta",
    workload: "peer-review-agent",
    forecastRevenue: 1250,
    actualRevenue: 1380,
    forecastCost: 390,
    actualCost: 620,
    includedUnits: 250,
    actualUnits: 281,
  },
];

const licensingDeals = [
  {
    dealId: "nih-policy-dashboard",
    buyerSegment: "government",
    forecastRevenue: 18000,
    probability: 0.7,
    actualRevenue: 0,
    status: "legal-review",
    targetCloseDate: "2026-05-03",
    aggregationPassed: true,
    minimumCohortSize: 260,
  },
  {
    dealId: "funding-intel-feed",
    buyerSegment: "market-intelligence",
    forecastRevenue: 6400,
    probability: 0.55,
    actualRevenue: 0,
    status: "privacy-review",
    targetCloseDate: "2026-05-24",
    aggregationPassed: false,
    minimumCohortSize: 12,
  },
  {
    dealId: "consortium-trend-api",
    buyerSegment: "academic-consortium",
    forecastRevenue: 7200,
    probability: 0.9,
    actualRevenue: 7200,
    status: "booked",
    targetCloseDate: "2026-05-11",
    aggregationPassed: true,
    minimumCohortSize: 90,
  },
];

module.exports = {
  reportId: "scibase-may-2026-forecast",
  policy,
  subscriptions,
  computeUsage,
  licensingDeals,
};
