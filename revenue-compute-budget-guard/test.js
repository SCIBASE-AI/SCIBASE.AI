const assert = require("node:assert/strict");
const sample = require("./sample-data.json");
const { evaluateAccount, evaluatePortfolio, renderMarkdownReport } = require("./budgetGuard");

const now = "2026-06-06T00:00:00Z";

const clearAccount = evaluateAccount(sample.accounts[0], { now });
assert.equal(clearAccount.decision, "CLEAR_TO_BILL");
assert.equal(clearAccount.findings.length, 0);
assert.equal(clearAccount.allowedInvoiceCents, 78000);

const warningAccount = evaluateAccount(sample.accounts[1], { now });
assert.equal(warningAccount.decision, "SEND_NOTICE_BEFORE_BILLING");
assert.equal(
  warningAccount.findings.some((finding) => finding.code === "BUDGET_THRESHOLD_NOTICE_STALE"),
  true
);
assert.equal(warningAccount.allowedInvoiceCents, 79800);

const holdAccount = evaluateAccount(sample.accounts[2], { now });
assert.equal(holdAccount.decision, "HOLD_COMPUTE_BILLING");
assert.equal(
  holdAccount.findings.some((finding) => finding.code === "UNCOVERED_COMPUTE_OVERAGE"),
  true
);
assert.equal(
  holdAccount.findings.some((finding) => finding.code === "HARD_CAP_WITHOUT_BILLING_HOLD"),
  true
);
assert.equal(holdAccount.allowedInvoiceCents, 90000);

const projectedAccount = evaluateAccount(
  {
    ...sample.accounts[0],
    accountId: "projected-warning",
    budgetCents: 300000,
    invoices: [{ invoiceId: "draft-projected", status: "draft", amountCents: 78000 }],
  },
  { now }
);
assert.equal(projectedAccount.decision, "SEND_NOTICE_BEFORE_BILLING");
assert.equal(
  projectedAccount.findings.some((finding) => finding.code === "PROJECTED_BUDGET_WARNING"),
  true
);

const portfolio = evaluatePortfolio(sample, { now });
assert.deepEqual(portfolio.decisionCounts, {
  CLEAR_TO_BILL: 1,
  SEND_NOTICE_BEFORE_BILLING: 1,
  HOLD_COMPUTE_BILLING: 1,
});
assert.equal(portfolio.totals.spendCents, 263300);
assert.equal(portfolio.totals.allowedInvoiceCents, 247800);

const report = renderMarkdownReport(portfolio);
assert.match(report, /Compute Budget Guard Report/);
assert.match(report, /lab-hold-003/);
assert.match(report, /HOLD_COMPUTE_BILLING/);

console.log("revenue-compute-budget-guard tests passed");
