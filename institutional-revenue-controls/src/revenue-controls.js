import crypto from "node:crypto";

const VALID_PO_STATUSES = new Set(["approved", "pending", "expired", "closed"]);
const VALID_INVOICE_STATUSES = new Set(["draft", "in-review", "approved", "on-hold", "sent", "paid"]);

export function cloneAccount(account) {
  return JSON.parse(JSON.stringify(account));
}

export function money(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function hashRecord(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 12)}`;
}

export function validateRevenueAccount(account) {
  const errors = [];
  const poIds = new Set();
  const budgetIds = new Set(account.budgets.map((budget) => budget.id));
  const approverIds = new Set(account.approvers.map((approver) => approver.id));
  const usageIds = new Set(account.usageEvents.map((usage) => usage.id));

  for (const po of account.purchaseOrders) {
    if (poIds.has(po.id)) {
      errors.push(`duplicate purchase order: ${po.id}`);
    }
    poIds.add(po.id);
    if (!VALID_PO_STATUSES.has(po.status)) {
      errors.push(`invalid purchase order status for ${po.id}: ${po.status}`);
    }
    if (po.remainingCents > po.amountCents) {
      errors.push(`purchase order ${po.id} remaining amount exceeds approved amount`);
    }
    for (const costCenterId of po.costCenters) {
      if (!budgetIds.has(costCenterId)) {
        errors.push(`purchase order ${po.id} references unknown cost center ${costCenterId}`);
      }
    }
    for (const approverId of po.approverIds) {
      if (!approverIds.has(approverId)) {
        errors.push(`purchase order ${po.id} references unknown approver ${approverId}`);
      }
    }
  }

  for (const usage of account.usageEvents) {
    if (!poIds.has(usage.purchaseOrderId)) {
      errors.push(`usage event ${usage.id} references missing purchase order ${usage.purchaseOrderId}`);
    }
    if (!budgetIds.has(usage.costCenterId)) {
      errors.push(`usage event ${usage.id} references missing cost center ${usage.costCenterId}`);
    }
  }

  for (const invoice of account.invoices) {
    if (!VALID_INVOICE_STATUSES.has(invoice.status)) {
      errors.push(`invalid invoice status for ${invoice.id}: ${invoice.status}`);
    }
    if (!poIds.has(invoice.purchaseOrderId)) {
      errors.push(`invoice ${invoice.id} references missing purchase order ${invoice.purchaseOrderId}`);
    }
    for (const line of invoice.lineItems) {
      if (!usageIds.has(line.usageEventId)) {
        errors.push(`invoice ${invoice.id} references missing usage event ${line.usageEventId}`);
      }
    }
    for (const approval of invoice.approvals) {
      if (!approverIds.has(approval.approverId)) {
        errors.push(`invoice ${invoice.id} references unknown approver ${approval.approverId}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      purchaseOrders: account.purchaseOrders.length,
      budgets: account.budgets.length,
      usageEvents: account.usageEvents.length,
      invoices: account.invoices.length,
      licensingExports: account.licensingExports.length,
    },
  };
}

export function priceUsageEvent(usage) {
  return usage.units * usage.unitPriceCents;
}

export function summarizeBudgets(account) {
  const currentUsageByBudget = new Map();
  for (const usage of account.usageEvents) {
    currentUsageByBudget.set(
      usage.costCenterId,
      (currentUsageByBudget.get(usage.costCenterId) ?? 0) + priceUsageEvent(usage),
    );
  }

  return account.budgets.map((budget) => {
    const currentPeriodCents = currentUsageByBudget.get(budget.id) ?? 0;
    const projectedSpentCents = budget.spentCents + currentPeriodCents;
    const percentUsed = (projectedSpentCents / budget.approvedCents) * 100;
    const state =
      percentUsed >= budget.hardLimitPct
        ? "hold"
        : percentUsed >= budget.warningThresholdPct
          ? "warn"
          : "ok";

    return {
      costCenterId: budget.id,
      label: budget.label,
      approvedCents: budget.approvedCents,
      spentCents: budget.spentCents,
      currentPeriodCents,
      projectedSpentCents,
      percentUsed: Number(percentUsed.toFixed(2)),
      state,
      remainingCents: Math.max(0, budget.approvedCents - projectedSpentCents),
    };
  });
}

export function reconcileInvoice(account, invoiceId) {
  const invoice = account.invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    throw new Error(`Unknown invoice: ${invoiceId}`);
  }

  const usageById = new Map(account.usageEvents.map((usage) => [usage.id, usage]));
  const po = account.purchaseOrders.find((item) => item.id === invoice.purchaseOrderId);
  const lineChecks = invoice.lineItems.map((line) => {
    const usage = usageById.get(line.usageEventId);
    const expectedCents = usage ? priceUsageEvent(usage) : 0;
    return {
      usageEventId: line.usageEventId,
      description: line.description,
      expectedCents,
      invoicedCents: line.amountCents,
      matchesUsage: expectedCents === line.amountCents,
      deltaCents: line.amountCents - expectedCents,
    };
  });

  const invoiceTotalCents = invoice.lineItems.reduce((sum, line) => sum + line.amountCents, 0);
  const approvalsPending = invoice.approvals.filter((approval) => approval.status !== "approved");
  const overPurchaseOrder = po ? invoiceTotalCents > po.remainingCents : true;
  const budgetSummaries = summarizeBudgets(account);
  const heldBudgets = budgetSummaries.filter((budget) => budget.state === "hold");
  const warningBudgets = budgetSummaries.filter((budget) => budget.state === "warn");
  const mismatchedLines = lineChecks.filter((line) => !line.matchesUsage);
  const status =
    mismatchedLines.length || overPurchaseOrder || heldBudgets.length
      ? "on-hold"
      : approvalsPending.length
        ? "in-review"
        : "approved";

  return {
    invoiceId,
    purchaseOrderId: invoice.purchaseOrderId,
    invoiceTotalCents,
    purchaseOrderRemainingCents: po?.remainingCents ?? 0,
    status,
    lineChecks,
    approvalsPending,
    overPurchaseOrder,
    heldBudgets,
    warningBudgets,
    evidenceHash: hashRecord({ invoiceId, lineChecks, status }),
  };
}

export function buildApprovalRoute(account, invoiceId) {
  const reconciliation = reconcileInvoice(account, invoiceId);
  const invoice = account.invoices.find((item) => item.id === invoiceId);
  const approvers = new Map(account.approvers.map((approver) => [approver.id, approver]));
  const invoiceTotalCents = reconciliation.invoiceTotalCents;

  const requiredApprovers = invoice.approvals.map((approval) => {
    const approver = approvers.get(approval.approverId);
    return {
      approverId: approval.approverId,
      name: approver?.name ?? "Unknown",
      role: approver?.role ?? "unknown",
      approvalLimitCents: approver?.approvalLimitCents ?? 0,
      status: approval.status,
      withinLimit: (approver?.approvalLimitCents ?? 0) >= invoiceTotalCents,
    };
  });

  const needsFinanceAdmin = !requiredApprovers.some(
    (approver) => approver.role === "finance-admin" && approver.withinLimit,
  );

  return {
    invoiceId,
    invoiceTotalCents,
    requiredApprovers,
    needsFinanceAdmin,
    routeStatus: reconciliation.status,
    routingReasons: [
      reconciliation.overPurchaseOrder ? "purchase-order-limit-exceeded" : null,
      reconciliation.heldBudgets.length ? "budget-hard-limit-reached" : null,
      reconciliation.approvalsPending.length ? "approvals-pending" : null,
      needsFinanceAdmin ? "finance-admin-required" : null,
    ].filter(Boolean),
  };
}

export function buildRevenueControlsDashboard(account) {
  const validation = validateRevenueAccount(account);
  const budgetSummaries = summarizeBudgets(account);
  const invoiceSummaries = account.invoices.map((invoice) => reconcileInvoice(account, invoice.id));
  const totalOpenInvoiceCents = invoiceSummaries.reduce((sum, invoice) => sum + invoice.invoiceTotalCents, 0);
  const licensingPipelineCents = account.licensingExports.reduce((sum, item) => sum + item.amountCents, 0);

  return {
    accountId: account.accountId,
    accountName: account.accountName,
    plan: account.contract.plan,
    validation,
    contract: {
      id: account.contract.id,
      billingCycle: account.contract.billingCycle,
      paymentTerms: account.contract.paymentTerms,
      slaTier: account.contract.slaTier,
      includedComputeCredits: account.contract.includedComputeCredits,
      licenseSeats: account.contract.licenseSeats,
    },
    budgetSummaries,
    invoiceSummaries,
    revenuePipeline: {
      openInvoiceCents: totalOpenInvoiceCents,
      openInvoiceDisplay: money(totalOpenInvoiceCents, account.billingCurrency),
      licensingPipelineCents,
      licensingPipelineDisplay: money(licensingPipelineCents, account.billingCurrency),
    },
    holds: [
      ...budgetSummaries.filter((budget) => budget.state === "hold").map((budget) => ({
        type: "budget",
        id: budget.costCenterId,
        reason: "hard limit reached",
      })),
      ...invoiceSummaries.filter((invoice) => invoice.status === "on-hold").map((invoice) => ({
        type: "invoice",
        id: invoice.invoiceId,
        reason: "reconciliation hold",
      })),
    ],
  };
}

export function buildFinanceAuditExport(account) {
  const dashboard = buildRevenueControlsDashboard(account);
  return {
    exportVersion: "institutional-revenue-controls/v0.1",
    accountId: account.accountId,
    exportedAt: "2026-05-15T01:10:00.000Z",
    contractHash: hashRecord(account.contract),
    purchaseOrders: account.purchaseOrders.map((po) => ({
      id: po.id,
      status: po.status,
      amountCents: po.amountCents,
      remainingCents: po.remainingCents,
      costCenters: po.costCenters,
      evidenceHash: hashRecord(po),
    })),
    budgetSummaries: dashboard.budgetSummaries,
    invoiceControls: account.invoices.map((invoice) => ({
      reconciliation: reconcileInvoice(account, invoice.id),
      approvalRoute: buildApprovalRoute(account, invoice.id),
    })),
    licensingExports: account.licensingExports.map((item) => ({
      id: item.id,
      cadence: item.cadence,
      redactionLevel: item.redactionLevel,
      amountCents: item.amountCents,
      evidenceHash: hashRecord(item),
    })),
    exportHash: hashRecord({
      accountId: account.accountId,
      contract: account.contract.id,
      invoices: account.invoices.map((invoice) => invoice.id),
      budgets: account.budgets.map((budget) => budget.id),
    }),
  };
}
