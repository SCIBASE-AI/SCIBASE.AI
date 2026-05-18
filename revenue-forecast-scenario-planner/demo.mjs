import { buildRevenueForecast, summarizeForecast } from "./index.mjs";

const forecast = buildRevenueForecast({
  startMonth: "2026-06",
  months: 6,
  plans: {
    pro: {
      monthlySeatCents: 4900,
      includedComputeUnits: 500,
      overageUnitCents: 25,
      annualDiscountPct: 8,
    },
    lab: {
      monthlySeatCents: 9500,
      includedComputeUnits: 2500,
      overageUnitCents: 18,
      annualDiscountPct: 12,
    },
    institutional: {
      monthlySeatCents: 18000,
      includedComputeUnits: 9000,
      overageUnitCents: 12,
      annualDiscountPct: 15,
    },
  },
  accounts: [
    {
      id: "lab-alpha",
      plan: "lab",
      seats: 18,
      billingCycle: "annual",
      status: "active",
      renewalMonth: "2026-09",
      churnRisk: 0.18,
      expectedSeatDelta: 4,
    },
    {
      id: "institution-beta",
      plan: "institutional",
      seats: 40,
      billingCycle: "monthly",
      status: "active",
      renewalMonth: "2026-08",
      churnRisk: 0.31,
      expectedSeatDelta: 10,
    },
  ],
  computeUsage: [
    { accountId: "lab-alpha", month: "2026-06", units: 2800 },
    { accountId: "institution-beta", month: "2026-06", units: 12000 },
    { accountId: "institution-beta", month: "2026-07", units: 8500 },
  ],
  licensingDeals: [
    {
      id: "policy-dashboard-pilot",
      segment: "government",
      startsAtMonth: "2026-07",
      monthlyCents: 250000,
      probability: 0.55,
    },
    {
      id: "consortium-metadata-api",
      segment: "academic-consortium",
      startsAtMonth: "2026-08",
      monthlyCents: 120000,
      probability: 0.4,
    },
  ],
});

console.log(summarizeForecast(forecast));
console.log("");
console.log("Monthly forecast");
for (const month of forecast.months) {
  console.log(
    `${month.month}: subscriptions=${month.streams.subscriptionsCents} compute=${month.streams.computeCents} licensing=${month.streams.licensingCents} total=${month.totalCents}`,
  );
}
console.log("");
console.log("Finance actions");
for (const action of forecast.actions) {
  console.log(`${action.month} ${action.type} ${action.target}: ${action.recommendation}`);
}
