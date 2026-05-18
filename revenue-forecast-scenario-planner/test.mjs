import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRevenueForecast } from "./index.mjs";

const plans = {
  lab: {
    monthlySeatCents: 5000,
    includedComputeUnits: 1000,
    overageUnitCents: 20,
    annualDiscountPct: 10,
  },
  enterprise: {
    monthlySeatCents: 12000,
    includedComputeUnits: 5000,
    overageUnitCents: 15,
    annualDiscountPct: 15,
  },
};

describe("revenue forecast scenario planner", () => {
  it("projects subscription, compute, and licensing revenue by month", () => {
    const forecast = buildRevenueForecast({
      startMonth: "2026-06",
      months: 3,
      plans,
      accounts: [
        {
          id: "lab-alpha",
          plan: "lab",
          seats: 10,
          billingCycle: "annual",
          status: "active",
        },
      ],
      computeUsage: [
        { accountId: "lab-alpha", month: "2026-06", units: 1200 },
        { accountId: "lab-alpha", month: "2026-07", units: 1600 },
        { accountId: "lab-alpha", month: "2026-08", units: 900 },
      ],
      licensingDeals: [
        {
          id: "nih-trends-feed",
          segment: "government",
          startsAtMonth: "2026-07",
          monthlyCents: 200000,
          probability: 0.5,
        },
      ],
    });

    assert.deepEqual(
      forecast.months.map((month) => ({
        month: month.month,
        subscriptionsCents: month.streams.subscriptionsCents,
        computeCents: month.streams.computeCents,
        licensingCents: month.streams.licensingCents,
        totalCents: month.totalCents,
      })),
      [
        {
          month: "2026-06",
          subscriptionsCents: 45000,
          computeCents: 4000,
          licensingCents: 0,
          totalCents: 49000,
        },
        {
          month: "2026-07",
          subscriptionsCents: 45000,
          computeCents: 12000,
          licensingCents: 100000,
          totalCents: 157000,
        },
        {
          month: "2026-08",
          subscriptionsCents: 45000,
          computeCents: 0,
          licensingCents: 100000,
          totalCents: 145000,
        },
      ],
    );

    assert.equal(forecast.summary.totalCents, 351000);
    assert.equal(forecast.summary.exitMrrCents, 145000);
    assert.equal(forecast.summary.exitArrCents, 1740000);
  });

  it("raises finance actions for quota pressure, renewal risk, and low-confidence licensing", () => {
    const forecast = buildRevenueForecast({
      startMonth: "2026-06",
      months: 2,
      plans,
      accounts: [
        {
          id: "enterprise-beta",
          plan: "enterprise",
          seats: 25,
          billingCycle: "monthly",
          status: "active",
          renewalMonth: "2026-07",
          churnRisk: 0.42,
        },
      ],
      computeUsage: [
        { accountId: "enterprise-beta", month: "2026-06", units: 8900 },
      ],
      licensingDeals: [
        {
          id: "consortium-analytics",
          segment: "academic-consortium",
          startsAtMonth: "2026-06",
          monthlyCents: 80000,
          probability: 0.35,
        },
      ],
    });

    assert.deepEqual(
      forecast.actions.map((action) => ({
        type: action.type,
        target: action.target,
        month: action.month,
      })),
      [
        {
          type: "compute_quota_pressure",
          target: "enterprise-beta",
          month: "2026-06",
        },
        {
          type: "renewal_risk",
          target: "enterprise-beta",
          month: "2026-07",
        },
        {
          type: "license_confidence_gap",
          target: "consortium-analytics",
          month: "2026-06",
        },
      ],
    );
  });

  it("builds downside and upside scenarios without leaking private customer names", () => {
    const forecast = buildRevenueForecast({
      startMonth: "2026-06",
      months: 1,
      plans,
      accounts: [
        {
          id: "lab-gamma",
          customerName: "Gamma Private Lab",
          plan: "lab",
          seats: 5,
          billingCycle: "monthly",
          status: "active",
          churnRisk: 0.2,
          expansionProbability: 0.3,
          expectedSeatDelta: 2,
        },
      ],
      computeUsage: [
        { accountId: "lab-gamma", month: "2026-06", units: 1000 },
      ],
      licensingDeals: [],
    });

    assert.equal(forecast.scenarios.downside.totalCents, 20000);
    assert.equal(forecast.scenarios.base.totalCents, 25000);
    assert.equal(forecast.scenarios.upside.totalCents, 35000);
    assert.ok(forecast.scenarios.downside.totalCents < forecast.scenarios.base.totalCents);
    assert.ok(forecast.scenarios.upside.totalCents > forecast.scenarios.base.totalCents);

    const serialized = JSON.stringify(forecast);
    assert.equal(serialized.includes("Gamma Private Lab"), false);
  });
});
