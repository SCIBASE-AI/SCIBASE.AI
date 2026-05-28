const assert = require("assert");
const { quotes } = require("./sample-data");
const { quoteTotal, reviewQuotes } = require("./index");

function byId(report, id) {
  return report.results.find((result) => result.quoteId === id);
}

function runTests() {
  assert.strictEqual(quoteTotal(quotes[0]), 90114);

  const report = reviewQuotes(quotes);
  assert.strictEqual(report.summary.quoteCount, 4);

  const clean = byId(report, "quote-clean-institutional");
  assert.strictEqual(clean.decision, "approve-activation");
  assert.strictEqual(clean.quoteScore, 100);

  const discount = byId(report, "quote-discount-overreach");
  assert.strictEqual(discount.decision, "hold-quote");
  assert.ok(discount.issues.some((issue) => issue.code === "discount-exceeds-approval"));
  assert.ok(discount.issues.some((issue) => issue.code === "seat-entitlement-overage"));
  assert.ok(discount.issues.some((issue) => issue.code === "missing-nonstandard-approval"));

  const drift = byId(report, "quote-invoice-drift");
  assert.strictEqual(drift.decision, "hold-quote");
  assert.ok(drift.issues.some((issue) => issue.code === "missing-purchase-order"));
  assert.ok(drift.issues.some((issue) => issue.code === "invoice-total-drift"));
  assert.ok(drift.issues.some((issue) => issue.code === "unquoted-invoice-line"));
  assert.ok(drift.issues.some((issue) => issue.code === "analytics-entitlement-overage"));

  const missing = byId(report, "quote-missing-legal-entity");
  assert.strictEqual(missing.decision, "hold-quote");
  assert.ok(missing.issues.some((issue) => issue.code === "quote-not-approved"));
  assert.ok(missing.issues.some((issue) => issue.code === "missing-legal-entity"));
  assert.ok(missing.issues.some((issue) => issue.code === "invoice-currency-drift"));

  console.log("revenue quote approval guard tests passed");
}

runTests();
