"use strict";

const assert = require("assert/strict");
const { evaluatePlanMigrations } = require("./index");

function account(overrides = {}) {
  return {
    id: "acct-university",
    name: "University Research Cloud",
    contractStatus: "active",
    currency: "USD",
    minimumSeats: 20,
    approvedPlanIds: ["growth", "enterprise", "enterprise-ai"],
    currentPlan: plan(),
    ...overrides,
  };
}

function plan(overrides = {}) {
  return {
    planId: "growth",
    interval: "year",
    currency: "USD",
    seats: 30,
    unitPriceCents: 12000,
    computeCreditCents: 60000,
    analyticsLicenseCents: 24000,
    termStart: "2026-01-01",
    termEnd: "2027-01-01",
    ...overrides,
  };
}

function migration(overrides = {}) {
  return {
    id: "mig-ready-upgrade",
    accountId: "acct-university",
    effectiveAt: "2026-07-01",
    invoiceId: "INV-MIG-001",
    quoteAccepted: true,
    approvalTicket: "FIN-119",
    paymentReadiness: true,
    targetPlan: plan({
      planId: "enterprise-ai",
      seats: 42,
      unitPriceCents: 18000,
      computeCreditCents: 120000,
      analyticsLicenseCents: 50000,
    }),
    computeCarryoverCents: 25000,
    ...overrides,
  };
}

{
  const report = evaluatePlanMigrations({
    accounts: [account()],
    migrations: [migration()],
  });

  assert.equal(report.migrationCount, 1);
  assert.equal(report.evaluations[0].status, "ready");
  assert.equal(report.evaluations[0].seatDelta, 12);
  assert.equal(report.totals.readyCount, 1);
  assert.ok(report.evaluations[0].netInvoiceCents > 0);
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
}

{
  const first = evaluatePlanMigrations({
    accounts: [account()],
    migrations: [migration()],
  });
  const second = evaluatePlanMigrations({
    accounts: [account()],
    migrations: [migration()],
  });
  assert.equal(first.auditDigest, second.auditDigest);
}

{
  const report = evaluatePlanMigrations({
    accounts: [account()],
    migrations: [
      migration({
        id: "mig-midterm-downgrade",
        approvalTicket: undefined,
        targetPlan: plan({
          planId: "growth",
          seats: 22,
          unitPriceCents: 8000,
          computeCreditCents: 10000,
          analyticsLicenseCents: 5000,
        }),
      }),
    ],
  });

  assert.equal(report.evaluations[0].status, "held");
  assert.ok(report.evaluations[0].creditMemoCents > 0);
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "downgrade_approval_required"));
}

{
  const report = evaluatePlanMigrations({
    accounts: [account()],
    migrations: [
      migration({
        id: "mig-seat-floor",
        targetPlan: plan({ planId: "growth", seats: 12 }),
      }),
    ],
  });

  assert.equal(report.evaluations[0].status, "blocked");
  assert.equal(report.totals.blockedCount, 1);
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "seat_floor"));
}

{
  const report = evaluatePlanMigrations({
    accounts: [account()],
    migrations: [
      migration({ id: "mig-a", invoiceId: "INV-DUP" }),
      migration({ id: "mig-b", invoiceId: "INV-DUP" }),
    ],
  });

  assert.equal(report.evaluations[0].status, "ready");
  assert.equal(report.evaluations[1].status, "blocked");
  assert.ok(report.evaluations[1].findings.some((finding) => finding.code === "duplicate_invoice"));
}

{
  const report = evaluatePlanMigrations({
    accounts: [
      account({
        currentPlan: plan({ planId: "trial", interval: "trial", unitPriceCents: 0, computeCreditCents: 0 }),
      }),
    ],
    migrations: [
      migration({
        id: "mig-trial-to-paid",
        paymentReadiness: false,
        invoiceId: "INV-TRIAL",
      }),
    ],
  });

  assert.equal(report.evaluations[0].status, "blocked");
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "missing_payment_readiness"));
}

{
  assert.throws(
    () =>
      evaluatePlanMigrations({
        accounts: [account()],
        migrations: [migration({ computeCarryoverCents: 12.5 })],
      }),
    /computeCarryoverCents must be a non-negative integer/
  );
}

console.log("plan-migration-proration-guard tests passed");
