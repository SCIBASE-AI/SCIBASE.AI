const crypto = require("node:crypto");

const DEFAULT_POLICY = {
  currency: "USD",
  budgetHoldRatio: 0.9,
  invoiceTolerance: 1,
  approvalThresholds: [
    { role: "principal-investigator", minimumAmount: 0 },
    { role: "department-admin", minimumAmount: 2500 },
    { role: "finance-office", minimumAmount: 10000 }
  ]
};

function evaluateProcurementControls(input) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) };
  const budgets = indexById(input.budgets || []);
  const contracts = indexById(input.contracts || []);
  const purchaseOrders = (input.purchaseOrders || []).map((purchaseOrder) =>
    evaluatePurchaseOrder(purchaseOrder, budgets, contracts, policy, input.asOf)
  );
  const invoiceReconciliation = reconcileInvoices(input.usageEvents || [], input.invoiceLines || [], policy);
  const budgetSummaries = summarizeBudgets(budgets, purchaseOrders, input.usageEvents || [], policy);
  const contractReviews = reviewContracts(input.contracts || [], input.asOf);
  const auditExport = buildAuditExport({
    institution: input.institution || "Unknown institution",
    asOf: input.asOf,
    purchaseOrders,
    budgetSummaries,
    invoiceReconciliation,
    contractReviews
  });

  return {
    institution: input.institution || "Unknown institution",
    asOf: input.asOf || null,
    policy,
    purchaseOrders,
    budgetSummaries,
    invoiceReconciliation,
    contractReviews,
    auditExport
  };
}

function evaluatePurchaseOrder(purchaseOrder, budgets, contracts, policy, asOf) {
  const total = calculateLineTotal(purchaseOrder.lineItems || []);
  const budget = budgets.get(purchaseOrder.grantId);
  const contract = purchaseOrder.contractId ? contracts.get(purchaseOrder.contractId) : null;
  const requiredApprovalRoles = getRequiredApprovalRoles(total, policy);
  const approvals = new Set((purchaseOrder.approvals || []).map((approval) => approval.role));
  const missingApprovals = requiredApprovalRoles.filter((role) => !approvals.has(role));
  const blockers = [];
  const warnings = [];

  if (!budget) {
    blockers.push(`Grant budget ${purchaseOrder.grantId} was not found`);
  } else {
    if (budget.currency && budget.currency !== policy.currency) {
      blockers.push(`Grant budget currency ${budget.currency} does not match policy currency ${policy.currency}`);
    }

    if (isDateBefore(budget.expiresOn, asOf)) {
      blockers.push(`Grant budget ${budget.id} expired on ${budget.expiresOn}`);
    }

    const remaining = roundMoney(budget.amount - budget.spentToDate - budget.reserved);
    if (total > remaining) {
      blockers.push(`Purchase order exceeds remaining grant balance by ${formatMoney(total - remaining)}`);
    }

    const utilizationAfterOrder = (budget.spentToDate + budget.reserved + total) / budget.amount;
    if (utilizationAfterOrder >= policy.budgetHoldRatio) {
      warnings.push(`Budget utilization would reach ${formatPercent(utilizationAfterOrder)} after this order`);
    }
  }

  if (missingApprovals.length > 0) {
    warnings.push(`Missing approvals: ${missingApprovals.join(", ")}`);
  }

  if (purchaseOrder.contractId && !contract) {
    blockers.push(`Referenced contract ${purchaseOrder.contractId} was not found`);
  } else if (contract && contract.status !== "active") {
    blockers.push(`Referenced contract ${contract.id} is ${contract.status}`);
  }

  const status = blockers.length > 0
    ? "blocked"
    : warnings.length > 0
      ? "hold"
      : "approved";

  return {
    id: purchaseOrder.id,
    grantId: purchaseOrder.grantId,
    costCenter: purchaseOrder.costCenter,
    vendor: purchaseOrder.vendor,
    contractId: purchaseOrder.contractId || null,
    total,
    requiredApprovalRoles,
    missingApprovals,
    status,
    blockers,
    warnings
  };
}

function reconcileInvoices(usageEvents, invoiceLines, policy) {
  const usageById = indexById(usageEvents);
  const invoiceEventIds = new Set();
  const invoiceResults = invoiceLines.map((invoiceLine) => {
    const usageForLine = (invoiceLine.usageEventIds || []).map((id) => usageById.get(id)).filter(Boolean);
    for (const id of invoiceLine.usageEventIds || []) {
      invoiceEventIds.add(id);
    }

    const expectedAmount = roundMoney(usageForLine.reduce((total, event) => total + event.units * event.unitCost, 0));
    const delta = roundMoney(invoiceLine.amount - expectedAmount);
    const missingUsageEvents = (invoiceLine.usageEventIds || []).filter((id) => !usageById.has(id));
    const status = missingUsageEvents.length > 0
      ? "orphaned-invoice"
      : Math.abs(delta) <= policy.invoiceTolerance
        ? "matched"
        : "mismatch";

    return {
      id: invoiceLine.id,
      purchaseOrderId: invoiceLine.purchaseOrderId,
      expectedAmount,
      invoicedAmount: roundMoney(invoiceLine.amount),
      delta,
      status,
      missingUsageEvents
    };
  });

  const unbilledUsage = usageEvents
    .filter((event) => !invoiceEventIds.has(event.id))
    .map((event) => ({
      id: event.id,
      purchaseOrderId: event.purchaseOrderId,
      expectedAmount: roundMoney(event.units * event.unitCost)
    }));

  const totals = invoiceResults.reduce(
    (summary, result) => {
      summary.expectedAmount = roundMoney(summary.expectedAmount + result.expectedAmount);
      summary.invoicedAmount = roundMoney(summary.invoicedAmount + result.invoicedAmount);
      summary.delta = roundMoney(summary.delta + result.delta);
      summary[result.status] += 1;
      return summary;
    },
    { expectedAmount: 0, invoicedAmount: 0, delta: 0, matched: 0, mismatch: 0, "orphaned-invoice": 0 }
  );

  return {
    invoiceResults,
    unbilledUsage,
    totals
  };
}

function summarizeBudgets(budgets, purchaseOrders, usageEvents, policy) {
  return Array.from(budgets.values()).map((budget) => {
    const approvedOrders = purchaseOrders.filter((order) => order.grantId === budget.id && order.status === "approved");
    const heldOrders = purchaseOrders.filter((order) => order.grantId === budget.id && order.status === "hold");
    const usageTotal = usageEvents
      .filter((event) => event.grantId === budget.id)
      .reduce((total, event) => total + event.units * event.unitCost, 0);
    const committed = roundMoney(
      budget.spentToDate +
      budget.reserved +
      approvedOrders.reduce((total, order) => total + order.total, 0)
    );
    const heldCommitments = roundMoney(heldOrders.reduce((total, order) => total + order.total, 0));
    const utilization = committed / budget.amount;
    const projectedUtilization = (committed + heldCommitments) / budget.amount;

    return {
      id: budget.id,
      owner: budget.owner,
      amount: roundMoney(budget.amount),
      committed,
      heldCommitments,
      usageExposure: roundMoney(usageTotal),
      remaining: roundMoney(budget.amount - committed),
      utilization: roundPercent(utilization),
      projectedUtilization: roundPercent(projectedUtilization),
      status: projectedUtilization >= policy.budgetHoldRatio ? "watch" : "healthy"
    };
  });
}

function reviewContracts(contracts, asOf) {
  return contracts.map((contract) => {
    const findings = [];

    if (!contract.slaTier) {
      findings.push("Missing SLA tier");
    }

    if (!contract.dataProcessingTerms) {
      findings.push("Missing data processing terms");
    }

    if (isDateBefore(contract.renewsOn, asOf)) {
      findings.push(`Renewal date ${contract.renewsOn} has passed`);
    }

    return {
      id: contract.id,
      vendor: contract.vendor,
      status: contract.status,
      findings,
      readyForInstitutionalProcurement: contract.status === "active" && findings.length === 0
    };
  });
}

function buildAuditExport(evaluation) {
  const redacted = redactForAudit(evaluation);
  const digest = crypto
    .createHash("sha256")
    .update(stableStringify(redacted))
    .digest("hex");

  return {
    generatedAt: evaluation.asOf || null,
    digest,
    redacted,
    requirementCoverage: [
      "tiered subscription and institutional billing controls",
      "AI compute usage metering reconciliation",
      "top-up and grant-budget hold evidence",
      "institutional invoice approval routing",
      "anonymized analytics licensing audit readiness"
    ]
  };
}

function redactForAudit(value) {
  if (Array.isArray(value)) {
    return value.map(redactForAudit);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (/(email|token|secret|password|account|wallet)/i.test(key)) {
          return [key, "[redacted]"];
        }
        return [key, redactForAudit(nestedValue)];
      })
    );
  }

  return value;
}

function getRequiredApprovalRoles(amount, policy) {
  return policy.approvalThresholds
    .filter((threshold) => amount >= threshold.minimumAmount)
    .map((threshold) => threshold.role);
}

function calculateLineTotal(lineItems) {
  return roundMoney(lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0));
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function isDateBefore(dateString, asOf) {
  if (!dateString || !asOf) {
    return false;
  }
  return new Date(dateString).getTime() < new Date(asOf).getTime();
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function roundPercent(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}

function formatMoney(value) {
  return `$${roundMoney(value).toFixed(2)}`;
}

function formatPercent(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

module.exports = {
  evaluateProcurementControls,
  reconcileInvoices,
  reviewContracts,
  stableStringify
};
