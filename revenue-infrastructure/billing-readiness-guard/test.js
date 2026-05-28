const assert = require("assert");
const {
  buildInvoicePreview,
  centsToDollars,
  digest,
  formatMoney,
  lineItem,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const {
  pricingCatalog,
  readyInstitutionAccount,
  reviewContext,
  riskyLabAccount,
} = require("./sample-data");

const risky = buildInvoicePreview(riskyLabAccount, pricingCatalog, reviewContext);
assert.strictEqual(risky.decision, "block-payment-provider-handoff");
assert.ok(risky.totalCents > riskyLabAccount.budgetCapCents, "risky invoice should exceed its approved cap");
assert.ok(risky.findings.some((item) => item.code === "NO_COLLECTABLE_PAYMENT_PATH"));
assert.ok(risky.findings.some((item) => item.code === "TAX_PROFILE_INCOMPLETE"));
assert.ok(risky.findings.some((item) => item.code === "BUDGET_CAP_EXCEEDED"));
assert.ok(risky.findings.some((item) => item.code === "COMPUTE_OVERAGE_UNATTESTED"));
assert.ok(risky.findings.some((item) => item.code === "LICENSING_EXPORT_NOT_ANONYMIZED"));
assert.ok(risky.findings.some((item) => item.code === "PRIVATE_CONTENT_IN_LICENSING_EXPORT"));
assert.ok(risky.lines.some((item) => item.code === "licensing:analytics-access"));

const repeat = buildInvoicePreview(riskyLabAccount, pricingCatalog, reviewContext);
assert.strictEqual(risky.invoiceDigest, repeat.invoiceDigest, "invoice digest must be deterministic");

const ready = buildInvoicePreview(readyInstitutionAccount, pricingCatalog, reviewContext);
assert.strictEqual(ready.decision, "ready-for-payment-provider");
assert.strictEqual(ready.findings.length, 0);
assert.ok(ready.totalCents < readyInstitutionAccount.budgetCapCents, "ready invoice should fit its budget cap");

const customLine = lineItem("usage:test", "Test usage", 2, 125);
assert.deepStrictEqual(customLine, {
  code: "usage:test",
  description: "Test usage",
  quantity: 2,
  unitCents: 125,
  totalCents: 250,
  metadata: {},
});
assert.strictEqual(centsToDollars(12345), 123.45);
assert.strictEqual(formatMoney(-2500), "$-25.00");
assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Billing Readiness Guard"));
assert.ok(markdown.includes("Synthetic billing packet only"));
assert.ok(markdown.includes("block-payment-provider-handoff"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Billing Readiness Guard"));

console.log("billing-readiness-guard tests passed");
