const assert = require("node:assert/strict");
const { buildRevenueForecastReport } = require("./index");
const sample = require("./sample-data");

const report = buildRevenueForecastReport(sample);

assert.equal(report.status, "blocked");
assert.equal(report.criticalCount, 2);
assert.equal(report.highCount, 5);
assert.equal(report.forecastRevenue, 39220);
assert.equal(report.currentRevenue, 23535);
assert.equal(report.variance, -15685);
assert.equal(report.variancePct, -39.99);
assert.equal(report.auditDigest.length, 16);

const actionCodes = new Set(report.actions.map((action) => action.code));
assert.ok(actionCodes.has("compute_margin_floor_breach"));
assert.ok(actionCodes.has("licensing_privacy_hold"));
assert.ok(actionCodes.has("subscription_forecast_shortfall"));
assert.ok(actionCodes.has("renewal_forecast_review"));

const labBeta = report.subscriptions.find((item) => item.accountId === "lab-beta");
assert.equal(labBeta.variancePct, -19.64);
assert.equal(labBeta.seatUtilization, 52.38);
assert.ok(labBeta.findings.some((finding) => finding.code === "seat_underutilization"));

const stableReport = buildRevenueForecastReport(sample);
assert.equal(stableReport.auditDigest, report.auditDigest);

const healthyReport = buildRevenueForecastReport({
  reportId: "healthy",
  policy: sample.policy,
  subscriptions: [
    {
      accountId: "healthy-lab",
      plan: "research-group",
      forecastMrr: 1000,
      actualMrr: 1015,
      contractedSeats: 10,
      activeSeats: 9,
      renewalDate: "2026-12-31",
      renewalConfidence: 0.95,
    },
  ],
  computeUsage: [
    {
      accountId: "healthy-lab",
      workload: "summarization",
      forecastRevenue: 500,
      actualRevenue: 510,
      forecastCost: 120,
      actualCost: 130,
      includedUnits: 100,
      actualUnits: 62,
    },
  ],
  licensingDeals: [
    {
      dealId: "booked-consortium",
      buyerSegment: "academic-consortium",
      forecastRevenue: 2000,
      probability: 1,
      actualRevenue: 2000,
      status: "booked",
      targetCloseDate: "2026-05-10",
      aggregationPassed: true,
      minimumCohortSize: 80,
    },
  ],
});

assert.equal(healthyReport.status, "ready");
assert.equal(healthyReport.actions.length, 0);
assert.equal(healthyReport.criticalCount, 0);
assert.equal(healthyReport.highCount, 0);

console.log("revenue forecast variance guard tests passed");
