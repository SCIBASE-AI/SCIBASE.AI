const assert = require("node:assert/strict");
const test = require("node:test");
const sampleLedger = require("../data/sample-procurement-ledger.json");
const {
  evaluateProcurementControls,
  reconcileInvoices,
  stableStringify
} = require("../src/procurement-controls");

test("classifies purchase orders by approval, budget, and contract readiness", () => {
  const evaluation = evaluateProcurementControls(sampleLedger);
  const byId = new Map(evaluation.purchaseOrders.map((order) => [order.id, order]));

  assert.equal(byId.get("po-1001").status, "hold");
  assert.deepEqual(byId.get("po-1001").missingApprovals, []);
  assert.match(byId.get("po-1001").warnings.join(" "), /Budget utilization/);

  assert.equal(byId.get("po-1002").status, "hold");
  assert.deepEqual(byId.get("po-1002").missingApprovals, ["finance-office"]);
  assert.match(byId.get("po-1002").warnings.join(" "), /Missing approvals/);

  assert.equal(byId.get("po-1003").status, "blocked");
  assert.match(byId.get("po-1003").blockers.join(" "), /exceeds remaining grant balance/);
});

test("reconciles invoices against usage events and reports mismatches", () => {
  const reconciliation = reconcileInvoices(sampleLedger.usageEvents, sampleLedger.invoiceLines, sampleLedger.policy);
  const byId = new Map(reconciliation.invoiceResults.map((line) => [line.id, line]));

  assert.equal(byId.get("invoice-line-1").status, "matched");
  assert.equal(byId.get("invoice-line-2").status, "mismatch");
  assert.equal(byId.get("invoice-line-2").delta, 90);
  assert.equal(byId.get("invoice-line-3").status, "orphaned-invoice");
  assert.deepEqual(byId.get("invoice-line-3").missingUsageEvents, ["missing-usage"]);
});

test("summarizes grant utilization and held commitments", () => {
  const evaluation = evaluateProcurementControls(sampleLedger);
  const byId = new Map(evaluation.budgetSummaries.map((budget) => [budget.id, budget]));

  assert.equal(byId.get("grant-ai-2026").status, "watch");
  assert.equal(byId.get("grant-ai-2026").heldCommitments, 7400);
  assert.equal(byId.get("grant-climate-2026").status, "watch");
  assert.equal(byId.get("grant-climate-2026").remaining, 19000);
});

test("produces a stable redacted audit digest", () => {
  const first = evaluateProcurementControls(sampleLedger).auditExport.digest;
  const second = evaluateProcurementControls(structuredClone(sampleLedger)).auditExport.digest;

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("stable stringify is independent of object key insertion order", () => {
  assert.equal(
    stableStringify({ b: 2, a: { d: 4, c: 3 } }),
    stableStringify({ a: { c: 3, d: 4 }, b: 2 })
  );
});
