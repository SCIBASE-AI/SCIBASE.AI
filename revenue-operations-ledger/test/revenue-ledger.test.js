import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoReport } from "../src/demo.js";
import {
  applyTopUps,
  decideEntitlements,
  meterUsage,
  packageAnalyticsLicense,
  quoteSubscription
} from "../src/revenue-ledger.js";

test("quotes annual institutional subscriptions with stacked discounts", () => {
  const quote = quoteSubscription({
    planId: "institution",
    seats: 10,
    billingCycle: "annual",
    couponCode: "CONSORTIUM_12",
    volumeDiscountPct: 6
  });

  assert.equal(quote.subtotalUsd, 288000);
  assert.equal(quote.totalDiscountPct, 40);
  assert.equal(quote.totalUsd, 172800);
  assert.equal(quote.included.supportTier, "sla");
});

test("meters usage by revenue stream", () => {
  const invoice = meterUsage({
    accountId: "acct-1",
    period: "2026-05",
    events: [
      { type: "ai_inference", credits: 1000 },
      { type: "reproducibility_job", hours: 2.5 },
      { type: "storage", gbMonths: 20 }
    ]
  });

  assert.deepEqual(invoice.totals, {
    aiCredits: 1000,
    computeHours: 2.5,
    storageGbMonths: 20
  });
  assert.equal(invoice.spendUsd.total, 22.85);
});

test("top-up ledger preserves replayable balances", () => {
  const ledger = applyTopUps({
    accountId: "acct-2",
    openingCredits: 100,
    transactions: [
      { id: "a", kind: "purchase", credits: 50 },
      { id: "b", kind: "debit", credits: 30 }
    ]
  });

  assert.equal(ledger.closingCredits, 120);
  assert.deepEqual(
    ledger.ledger.map((entry) => entry.balanceAfter),
    [150, 120]
  );
});

test("entitlement decisions flag only real overages", () => {
  const entitlements = decideEntitlements({
    planId: "individual_pro",
    seats: 1,
    usage: { aiCredits: 1500, computeHours: 12 },
    topUpCredits: 400
  });

  assert.equal(entitlements.aiCredits.overLimit, false);
  assert.equal(entitlements.computeHours.billableOverage, 2);
  assert.deepEqual(entitlements.actions, ["allow_ai_jobs", "invoice_compute_overage"]);
});

test("analytics licensing excludes private content", () => {
  const license = packageAnalyticsLicense({
    customerId: "policy-lab",
    seats: 2,
    datasets: [
      { id: "public", fields: ["doi"], refreshCadence: "daily" },
      { id: "private", fields: ["note"], refreshCadence: "never", privateContent: true }
    ]
  });

  assert.equal(license.monthlyUsd, 240);
  assert.deepEqual(license.allowedDatasets.map((dataset) => dataset.id), ["public"]);
  assert.deepEqual(license.deniedDatasetIds, ["private"]);
});

test("demo report builds an audit-ready invoice and health summary", () => {
  const report = buildDemoReport();

  assert.equal(report.invoice.invoiceId, "SCI-NORTHBRIDGE-2026-05");
  assert.equal(report.invoice.paymentRails.includes("institutional_invoice"), true);
  assert.equal(report.revenueHealth.invoiceCount, 1);
  assert.equal(report.licensingPackage.policy, "private_content_excluded");
});
