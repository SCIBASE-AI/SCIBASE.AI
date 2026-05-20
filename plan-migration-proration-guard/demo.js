"use strict";

const { evaluatePlanMigrations, money } = require("./index");

const sample = {
  accounts: [
    {
      id: "acct-national-lab",
      name: "National Lab AI Platform",
      contractStatus: "active",
      currency: "USD",
      minimumSeats: 50,
      approvedPlanIds: ["enterprise", "enterprise-ai", "analytics-plus"],
      currentPlan: {
        planId: "enterprise",
        interval: "year",
        currency: "USD",
        seats: 60,
        unitPriceCents: 14000,
        computeCreditCents: 200000,
        analyticsLicenseCents: 90000,
        termStart: "2026-01-01",
        termEnd: "2027-01-01",
      },
    },
    {
      id: "acct-clinical-consortium",
      name: "Clinical Consortium",
      contractStatus: "active",
      currency: "USD",
      minimumSeats: 35,
      approvedPlanIds: ["enterprise", "analytics-plus"],
      currentPlan: {
        planId: "enterprise",
        interval: "year",
        currency: "USD",
        seats: 42,
        unitPriceCents: 11000,
        computeCreditCents: 90000,
        analyticsLicenseCents: 40000,
        termStart: "2026-02-01",
        termEnd: "2027-02-01",
      },
    },
    {
      id: "acct-trial-team",
      name: "Trial Research Team",
      contractStatus: "active",
      currency: "USD",
      minimumSeats: 5,
      approvedPlanIds: ["growth", "enterprise"],
      currentPlan: {
        planId: "trial",
        interval: "trial",
        currency: "USD",
        seats: 8,
        unitPriceCents: 0,
        computeCreditCents: 0,
        analyticsLicenseCents: 0,
        termStart: "2026-05-01",
        termEnd: "2026-06-01",
      },
    },
  ],
  migrations: [
    {
      id: "mig-upgrade-ai",
      accountId: "acct-national-lab",
      effectiveAt: "2026-07-01",
      invoiceId: "INV-MIG-501",
      quoteAccepted: true,
      approvalTicket: "FIN-501",
      paymentReadiness: true,
      targetPlan: {
        planId: "enterprise-ai",
        interval: "year",
        currency: "USD",
        seats: 75,
        unitPriceCents: 19000,
        computeCreditCents: 350000,
        analyticsLicenseCents: 120000,
        termStart: "2026-01-01",
        termEnd: "2027-01-01",
      },
      computeCarryoverCents: 90000,
    },
    {
      id: "mig-midterm-downshift",
      accountId: "acct-clinical-consortium",
      effectiveAt: "2026-06-15",
      invoiceId: "INV-MIG-502",
      quoteAccepted: true,
      targetPlan: {
        planId: "analytics-plus",
        interval: "year",
        currency: "USD",
        seats: 36,
        unitPriceCents: 9000,
        computeCreditCents: 20000,
        analyticsLicenseCents: 80000,
        termStart: "2026-02-01",
        termEnd: "2027-02-01",
      },
      computeCarryoverCents: 70000,
    },
    {
      id: "mig-trial-conversion",
      accountId: "acct-trial-team",
      effectiveAt: "2026-05-20",
      quoteAccepted: false,
      paymentReadiness: false,
      targetPlan: {
        planId: "growth",
        interval: "year",
        currency: "USD",
        seats: 10,
        unitPriceCents: 6500,
        computeCreditCents: 25000,
        analyticsLicenseCents: 12000,
        termStart: "2026-05-20",
        termEnd: "2027-05-20",
      },
    },
  ],
};

const report = evaluatePlanMigrations(sample);

console.log("Plan Migration Proration Guard Demo");
console.log("===================================");
console.log(`migrations: ${report.migrationCount}`);
console.log(`ready: ${report.totals.readyCount}, held: ${report.totals.heldCount}, blocked: ${report.totals.blockedCount}`);
console.log(`net invoice: ${money(report.totals.netInvoiceCents)}`);
console.log(`credit memo: ${money(report.totals.creditMemoCents)}`);
console.log(`annualized delta: ${money(report.totals.annualizedRevenueDeltaCents)}`);
console.log(`audit digest: ${report.auditDigest.slice(0, 16)}...`);

for (const evaluation of report.evaluations) {
  console.log("");
  console.log(`${evaluation.migrationId} ${evaluation.status.toUpperCase()} ${evaluation.fromPlanId} -> ${evaluation.toPlanId}`);
  console.log(`  invoice ${money(evaluation.netInvoiceCents)} credit ${money(evaluation.creditMemoCents)} seats ${evaluation.seatDelta >= 0 ? "+" : ""}${evaluation.seatDelta}`);
  for (const finding of evaluation.findings) {
    console.log(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  }
  for (const action of evaluation.recommendedActions) {
    console.log(`  action: ${action}`);
  }
}
