import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInstitutionInvoice,
  meterAiCompute,
  normalizeCatalog,
  prepareLicensingExport,
  quoteSubscription,
  revenueHealthSnapshot,
} from "../src/index.js";
import fixture from "../sample/revenue-fixture.json" with { type: "json" };

test("validates plan catalog and billing cycles", () => {
  const catalog = normalizeCatalog(fixture.catalog);

  assert.equal(catalog.plans.length, 2);
  assert.equal(catalog.plans[0].entitlements.includes("priority-support"), true);
  assert.throws(
    () => normalizeCatalog({ plans: [{ ...fixture.catalog.plans[0], billingCycle: "weekly" }] }),
    /unsupported billing cycle/,
  );
});

test("quotes subscriptions with seats, volume discounts, coupons, and trials", () => {
  const quote = quoteSubscription(fixture.catalog, fixture.accounts[0]);

  assert.equal(quote.extraSeats, 16);
  assert.equal(quote.discountRate, 0.3);
  assert.equal(quote.total, 604.1);

  const trialQuote = quoteSubscription(fixture.catalog, { ...fixture.accounts[0], inTrial: true });
  assert.equal(trialQuote.total, 0);
  assert.equal(trialQuote.trialCredit, 604.1);
});

test("meters AI compute quotas and top-up credits", () => {
  const meter = meterAiCompute(
    fixture.catalog,
    fixture.accounts[0],
    fixture.usageByAccount[fixture.accounts[0].id],
    fixture.topUps,
  );

  assert.equal(meter.includedCredits, 20000);
  assert.equal(meter.purchasedCredits, 5000);
  assert.equal(meter.overageCredits, 6500);
  assert.equal(meter.overageCost, 97.5);
  assert.equal(meter.quotaStatus, "over_quota");
});

test("builds institutional invoices with subscription, top-up, and overage lines", () => {
  const invoice = buildInstitutionInvoice(
    fixture.catalog,
    fixture.accounts[0],
    fixture.usageByAccount[fixture.accounts[0].id],
    fixture.topUps,
  );

  assert.equal(invoice.lines.length, 3);
  assert.equal(invoice.total, 796.6);
  assert.equal(invoice.entitlements.includes("private-projects"), true);
});

test("prepares anonymized licensing exports and blocks private fields", () => {
  const exportResult = prepareLicensingExport(fixture.licensingExport);

  assert.equal(exportResult.ready, true);
  assert.equal(exportResult.dataClassification, "anonymized_research_metadata_only");
  assert.equal(exportResult.sample[0].privateProjectTitle, undefined);

  const blocked = prepareLicensingExport({
    ...fixture.licensingExport,
    fields: [...fixture.licensingExport.fields, "privateProjectTitle"],
  });
  assert.equal(blocked.ready, false);
  assert.deepEqual(blocked.blockedFields, ["privateProjectTitle"]);
});

test("computes revenue health snapshots for MRR, ARR, invoices, and quota alerts", () => {
  const health = revenueHealthSnapshot(
    fixture.catalog,
    fixture.accounts,
    fixture.usageByAccount,
    fixture.topUps,
  );

  assert.equal(health.accountCount, 2);
  assert.equal(health.monthlyRecurringRevenue, 3715.1);
  assert.equal(health.annualRecurringRevenue, 44581.2);
  assert.equal(health.invoiceTotal, 38128.6);
  assert.deepEqual(health.quotaAlerts, [{ accountId: "account-open-bio-lab", quotaStatus: "over_quota" }]);
});
