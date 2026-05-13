import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAnalyticsLicenseExport,
  buildEntitlements,
  buildInvoice,
  buildPlanCatalog,
  buildRevenueReport,
  meterComputeUsage,
  priceSubscription
} from "../src/revenue.js";
import { analyticsDataset, customer, plans, topUps, usageEvents } from "../src/sample-data.js";

test("plan catalog exposes annual savings and enterprise readiness", () => {
  const catalog = buildPlanCatalog(plans);
  const institutional = catalog.find((plan) => plan.id === "institutional");

  assert.ok(catalog.find((plan) => plan.id === "individual-pro").annualSavingsUsd > 0);
  assert.equal(institutional.enterpriseReady, true);
});

test("subscription pricing applies annual cycle, extra seats, and consortium discount", () => {
  const subscription = priceSubscription(plans, customer);

  assert.equal(subscription.planId, "lab-team");
  assert.equal(subscription.billingCycle, "annual");
  assert.ok(subscription.discountUsd > 0);
  assert.ok(subscription.totalBeforeTaxUsd < subscription.subtotalUsd);
});

test("usage meters calculate AI compute charges by meter", () => {
  const usage = meterComputeUsage(usageEvents);

  assert.equal(usage.lines.length, usageEvents.length);
  assert.ok(usage.totalUsageUsd > 0);
  assert.ok(usage.lines.some((line) => line.meter === "reproducibility-job"));
});

test("entitlements include plan credits plus top-ups", () => {
  const entitlements = buildEntitlements(plans, customer, topUps);

  assert.equal(entitlements.topUpCredits, 5000);
  assert.ok(entitlements.aiCredits > plans.find((plan) => plan.id === customer.planId).includedAiCredits);
  assert.equal(entitlements.prioritySupport, true);
});

test("analytics licensing export excludes private content", () => {
  const exportPayload = buildAnalyticsLicenseExport(analyticsDataset);

  assert.equal(exportPayload.containsPrivateContent, false);
  assert.ok(exportPayload.excludedFields.includes("private_content"));
  assert.ok(exportPayload.fields.includes("reproducibility_score"));
});

test("invoice includes payment metadata without creating a live charge", () => {
  const invoice = buildInvoice({ id: "inv-test", planList: plans, customer, usageEvents, topUps, analyticsLicense: analyticsDataset });

  assert.ok(invoice.totalUsd > 0);
  assert.equal(invoice.paymentIntent.provider, "institutional-invoice");
  assert.equal(invoice.paymentIntent.liveChargeCreated, false);
  assert.ok(invoice.lines.some((line) => line.type === "analytics-license"));
});

test("revenue report summarizes recurring, usage, top-up, licensing, and invoice health", () => {
  const report = buildRevenueReport({ planList: plans, customer, usageEvents, topUps, analyticsLicense: analyticsDataset });

  assert.ok(report.health.recurringUsd > 0);
  assert.ok(report.health.usageUsd > 0);
  assert.equal(report.health.licensingUsd, analyticsDataset.licenseUsd);
  assert.equal(report.invoice.paymentIntent.amountUsd, report.invoice.totalUsd);
});
