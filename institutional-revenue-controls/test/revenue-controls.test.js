import assert from "node:assert/strict";
import test from "node:test";
import { sampleRevenueAccount } from "../src/sample-data.js";
import {
  buildApprovalRoute,
  buildFinanceAuditExport,
  buildRevenueControlsDashboard,
  cloneAccount,
  priceUsageEvent,
  reconcileInvoice,
  summarizeBudgets,
  validateRevenueAccount,
} from "../src/revenue-controls.js";

test("validates purchase orders, budgets, usage events, invoices, and approvers", () => {
  const validation = validateRevenueAccount(sampleRevenueAccount);

  assert.equal(validation.valid, true);
  assert.equal(validation.counts.purchaseOrders, 2);
  assert.equal(validation.counts.invoices, 1);
  assert.equal(validation.counts.licensingExports, 1);
});

test("prices usage events deterministically", () => {
  assert.equal(priceUsageEvent(sampleRevenueAccount.usageEvents[0]), 36000);
  assert.equal(priceUsageEvent(sampleRevenueAccount.usageEvents[2]), 80000);
});

test("summarizes budget thresholds and places high-risk grants on hold", () => {
  const summaries = summarizeBudgets(sampleRevenueAccount);
  const aiBudget = summaries.find((budget) => budget.costCenterId === "grant-ai");

  assert.equal(aiBudget.state, "hold");
  assert.equal(aiBudget.percentUsed, 97.92);
});

test("reconciles invoice lines against usage and budget controls", () => {
  const reconciliation = reconcileInvoice(sampleRevenueAccount, "inv-2026-05-draft");

  assert.equal(reconciliation.invoiceTotalCents, 81000);
  assert.equal(reconciliation.lineChecks.every((line) => line.matchesUsage), true);
  assert.equal(reconciliation.status, "on-hold");
  assert.equal(reconciliation.heldBudgets.length, 1);
});

test("builds approval route with finance-admin requirement and pending approvals", () => {
  const route = buildApprovalRoute(sampleRevenueAccount, "inv-2026-05-draft");

  assert.equal(route.routeStatus, "on-hold");
  assert.equal(route.requiredApprovers.length, 2);
  assert.equal(route.needsFinanceAdmin, false);
  assert.ok(route.routingReasons.includes("budget-hard-limit-reached"));
  assert.ok(route.routingReasons.includes("approvals-pending"));
});

test("dashboard exposes revenue pipeline, holds, and contract metadata", () => {
  const dashboard = buildRevenueControlsDashboard(sampleRevenueAccount);

  assert.equal(dashboard.plan, "institutional-enterprise");
  assert.equal(dashboard.revenuePipeline.openInvoiceCents, 81000);
  assert.equal(dashboard.holds.some((hold) => hold.type === "budget"), true);
  assert.equal(dashboard.contract.paymentTerms, "net-30");
});

test("finance audit export contains deterministic evidence hashes", () => {
  const audit = buildFinanceAuditExport(sampleRevenueAccount);

  assert.equal(audit.exportVersion, "institutional-revenue-controls/v0.1");
  assert.equal(audit.purchaseOrders.length, 2);
  assert.equal(audit.invoiceControls.length, 1);
  assert.match(audit.exportHash, /^sha256:/);
});

test("invalid references are reported", () => {
  const broken = cloneAccount(sampleRevenueAccount);
  broken.usageEvents[0].purchaseOrderId = "missing-po";

  const validation = validateRevenueAccount(broken);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /missing purchase order/);
});
