const assert = require("assert");
const { ACTIONS, evaluatePortfolio, expectedTrueUpCents } = require("./guard");
const portfolio = require("./fixtures/contracts.json");

const result = evaluatePortfolio(portfolio);
const invoices = new Map(
  result.evaluations.flatMap((contract) => contract.invoices.map((invoice) => [invoice.invoiceId, invoice]))
);

assert.strictEqual(result.summary.contracts, 6);
assert.strictEqual(result.summary.invoices, 7);
assert.strictEqual(result.summary.release, 2);
assert.strictEqual(result.summary.review, 1);
assert.strictEqual(result.summary.hold, 4);

assert.strictEqual(invoices.get("INV-CLEAN-Q1").action, ACTIONS.release);
assert.strictEqual(invoices.get("INV-CLEAN-Q1").expectedTrueUpCents, 225000);
assert.strictEqual(invoices.get("INV-CLEAN-Q1").proposedTrueUpCents, 225000);
assert.strictEqual(invoices.get("INV-CLEAN-Q1").findings.length, 0);

assert.strictEqual(invoices.get("INV-UNDER-Q1").action, ACTIONS.hold);
assert.ok(invoices.get("INV-UNDER-Q1").findings.some((finding) => finding.code === "TRUEUP_VARIANCE"));

assert.strictEqual(invoices.get("INV-DUP-Q1-B").action, ACTIONS.hold);
assert.ok(invoices.get("INV-DUP-Q1-B").findings.some((finding) => finding.code === "DUPLICATE_TRUEUP_WINDOW"));

assert.strictEqual(invoices.get("INV-AMEND-Q1").action, ACTIONS.hold);
assert.ok(invoices.get("INV-AMEND-Q1").findings.some((finding) => finding.code === "FUTURE_AMENDMENT_APPLIED_EARLY"));

assert.strictEqual(invoices.get("INV-SLA-Q1").action, ACTIONS.hold);
assert.ok(invoices.get("INV-SLA-Q1").findings.some((finding) => finding.code === "SLA_CREDIT_EXCEEDS_CAP"));
assert.ok(invoices.get("INV-SLA-Q1").findings.some((finding) => finding.code === "MISSING_SLA_TICKET"));

assert.strictEqual(invoices.get("INV-REVIEW-Q1").action, ACTIONS.review);
assert.ok(invoices.get("INV-REVIEW-Q1").findings.some((finding) => finding.code === "TRUEUP_VARIANCE"));
assert.ok(invoices.get("INV-REVIEW-Q1").findings.some((finding) => finding.code === "MISSING_SLA_TICKET"));

assert.strictEqual(
  expectedTrueUpCents(
    {
      meteredUsageCents: 125000,
      slaCreditCents: 25000,
    },
    100000
  ),
  0
);

console.log("revenue-commitment-trueup-guard tests passed");
