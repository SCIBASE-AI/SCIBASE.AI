const crypto = require("node:crypto");

function buildRevenueClose(input) {
  const validation = validateCloseInput(input);
  const period = {
    start: parseDate(input.periodStart),
    end: parseDate(input.periodEnd),
    asOf: parseDateTime(input.asOf || input.periodEnd)
  };
  const policies = normalizePolicies(input.policies || {});
  const contracts = (input.contracts || []).map((contract) =>
    closeContract(contract, period, policies, input.currency || "USD")
  );
  const totals = summarizeTotals(contracts);
  const dunningQueue = contracts.filter((contract) => contract.dunning.status === "queued");
  const creditAndRefundHolds = contracts.flatMap((contract) => contract.holds);
  const journalEntries = buildJournalEntries(input, contracts, totals);
  const auditTrail = buildAuditTrail(input, contracts, totals, dunningQueue, creditAndRefundHolds);
  const dashboard = buildDashboard(input, contracts, totals, dunningQueue, creditAndRefundHolds);

  const close = {
    closeId: input.closeId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    asOf: input.asOf,
    currency: input.currency || "USD",
    validation,
    totals,
    contracts,
    dunningQueue,
    creditAndRefundHolds,
    journalEntries,
    dashboard,
    auditTrail
  };

  close.digest = stableDigest(close);
  return close;
}

function validateCloseInput(input) {
  const required = [
    ["closeId", input.closeId],
    ["periodStart", input.periodStart],
    ["periodEnd", input.periodEnd],
    ["contracts", (input.contracts || []).length]
  ];
  const missing = required.filter(([, value]) => !value).map(([field]) => field);
  const contractIssues = (input.contracts || []).flatMap((contract) => {
    const issues = [];
    if (!contract.id) issues.push("contract.id");
    if (!contract.customer) issues.push(`${contract.id || "unknown"}.customer`);
    if (!["subscription", "compute", "license"].includes(contract.stream)) {
      issues.push(`${contract.id || "unknown"}.stream`);
    }
    if (typeof contract.amount !== "number" || contract.amount < 0) {
      issues.push(`${contract.id || "unknown"}.amount`);
    }
    if (!contract.serviceStart || !contract.serviceEnd) {
      issues.push(`${contract.id || "unknown"}.service-period`);
    }
    return issues;
  });

  return {
    status: missing.length === 0 && contractIssues.length === 0 ? "passed" : "incomplete",
    score: Math.max(0, 100 - missing.length * 15 - contractIssues.length * 5),
    missing,
    contractIssues
  };
}

function closeContract(contract, period, policies, currency) {
  const serviceStart = parseDate(contract.serviceStart);
  const serviceEnd = parseDate(contract.serviceEnd);
  const netAmount = money(contract.amount - approvedAdjustments(contract));
  const revenue = recognizeRevenue(contract, period, serviceStart, serviceEnd, netAmount);
  const payment = evaluatePayment(contract, period, netAmount);
  const dunning = evaluateDunning(contract, payment, period, policies);
  const holds = buildHolds(contract, revenue, payment, dunning, currency);

  return {
    id: contract.id,
    customer: contract.customer,
    stream: contract.stream,
    invoiceId: contract.invoiceId,
    netAmount,
    revenue,
    payment,
    dunning,
    holds,
    closeStatus: chooseCloseStatus(revenue, payment, dunning, holds)
  };
}

function recognizeRevenue(contract, period, serviceStart, serviceEnd, netAmount) {
  if (contract.stream === "subscription") {
    return recognizeRatable(contract, period, serviceStart, serviceEnd, netAmount);
  }
  if (contract.stream === "compute") {
    return recognizeCompute(contract, period, netAmount);
  }
  return recognizeLicense(contract, period, netAmount);
}

function recognizeRatable(contract, period, serviceStart, serviceEnd, netAmount) {
  const serviceDays = Math.max(1, dayDiff(serviceStart, serviceEnd));
  const periodEarnedDays = overlapDays(serviceStart, serviceEnd, period.start, period.end);
  const earnedThroughCloseDays = overlapDays(serviceStart, serviceEnd, serviceStart, period.end);
  const recognizedThisPeriod = money(netAmount * (periodEarnedDays / serviceDays));
  const recognizedToDate = money(netAmount * (earnedThroughCloseDays / serviceDays));
  const deferredAfterClose = money(Math.max(0, netAmount - recognizedToDate));

  return {
    method: "ratable-service-period",
    recognizedThisPeriod,
    recognizedToDate,
    deferredAfterClose,
    evidence: [`${periodEarnedDays} of ${serviceDays} service days earned in close period`]
  };
}

function recognizeCompute(contract, period, netAmount) {
  const billableEvents = (contract.usageEvents || []).filter((event) =>
    event.billable && isInPeriod(parseDateTime(event.occurredAt), period.start, period.end)
  );
  const recognizedThisPeriod = money(
    billableEvents.reduce((sum, event) => sum + event.units * event.unitPrice, 0)
  );
  const cappedRecognized = Math.min(recognizedThisPeriod, netAmount);
  const deferredAfterClose = money(Math.max(0, netAmount - cappedRecognized));

  return {
    method: "billable-usage-events",
    recognizedThisPeriod: cappedRecognized,
    recognizedToDate: cappedRecognized,
    deferredAfterClose,
    evidence: billableEvents.map((event) => `${event.id}: ${event.units} units x ${formatMoney(event.unitPrice)}`)
  };
}

function recognizeLicense(contract, period, netAmount) {
  const acceptedDeliverables = (contract.licenseDeliverables || []).filter((deliverable) =>
    deliverable.accepted && isInPeriod(parseDateTime(deliverable.deliveredAt), period.start, period.end)
  );
  const recognizedThisPeriod = money(
    Math.min(netAmount, acceptedDeliverables.reduce((sum, item) => sum + item.amount, 0))
  );
  const deferredAfterClose = money(Math.max(0, netAmount - recognizedThisPeriod));

  return {
    method: "accepted-license-deliverables",
    recognizedThisPeriod,
    recognizedToDate: recognizedThisPeriod,
    deferredAfterClose,
    evidence: acceptedDeliverables.map((item) => `${item.id}: accepted deliverable`)
  };
}

function evaluatePayment(contract, period, netAmount) {
  const paidAt = contract.paidAt ? parseDateTime(contract.paidAt) : null;
  const paidByClose = Boolean(paidAt && paidAt <= period.asOf);
  const receivableAtClose = paidByClose ? 0 : netAmount;
  const dueDate = contract.dueDate ? parseDate(contract.dueDate) : null;
  const daysPastDue = dueDate && !paidByClose
    ? Math.max(0, Math.floor((period.asOf - dueDate) / 864e5))
    : 0;

  return {
    status: paidByClose ? "collected" : "open-receivable",
    paidAt: contract.paidAt || null,
    receivableAtClose,
    daysPastDue
  };
}

function evaluateDunning(contract, payment, period, policies) {
  if (payment.status === "collected" || payment.daysPastDue < policies.paymentGraceDays) {
    return {
      status: "not-needed",
      daysPastDue: payment.daysPastDue,
      action: null,
      owner: null
    };
  }

  const step = policies.dunningSteps
    .filter((candidate) => payment.daysPastDue >= candidate.afterDays)
    .sort((a, b) => b.afterDays - a.afterDays)[0];

  return {
    status: "queued",
    daysPastDue: payment.daysPastDue,
    action: step ? step.action : "manual-review",
    owner: step ? step.owner : "finance"
  };
}

function buildHolds(contract, revenue, payment, dunning, currency) {
  const pendingCredits = (contract.credits || []).filter((credit) => credit.status === "pending");
  const pendingRefunds = (contract.refunds || []).filter((refund) => refund.status === "pending");
  const holds = [];

  for (const credit of pendingCredits) {
    holds.push({
      contractId: contract.id,
      type: "credit-review",
      amount: credit.amount,
      currency,
      reason: credit.reason,
      recommendedAction: "Resolve credit memo request before final close certification."
    });
  }
  for (const refund of pendingRefunds) {
    holds.push({
      contractId: contract.id,
      type: "refund-review",
      amount: refund.amount,
      currency,
      reason: refund.reason,
      recommendedAction: "Hold revenue release until refund approval is decided."
    });
  }
  if (dunning.status === "queued" && revenue.recognizedThisPeriod > 0) {
    holds.push({
      contractId: contract.id,
      type: "collection-risk",
      amount: payment.receivableAtClose,
      currency,
      reason: `${contract.invoiceId || contract.id} is ${payment.daysPastDue} days past due.`,
      recommendedAction: "Finance should certify collectability or reserve the balance."
    });
  }
  return holds;
}

function summarizeTotals(contracts) {
  return {
    recognizedThisPeriod: money(sum(contracts, (contract) => contract.revenue.recognizedThisPeriod)),
    deferredAfterClose: money(sum(contracts, (contract) => contract.revenue.deferredAfterClose)),
    receivableAtClose: money(sum(contracts, (contract) => contract.payment.receivableAtClose)),
    cashCollected: money(sum(contracts, (contract) => contract.payment.status === "collected" ? contract.netAmount : 0)),
    contractsClosed: contracts.filter((contract) => contract.closeStatus === "closed").length,
    contractsNeedingAttention: contracts.filter((contract) => contract.closeStatus !== "closed").length
  };
}

function buildJournalEntries(input, contracts, totals) {
  const entries = [];
  if (totals.recognizedThisPeriod > 0) {
    entries.push({
      id: `${input.closeId}-revenue`,
      debit: "deferred_revenue_or_accounts_receivable",
      credit: "recognized_revenue",
      amount: totals.recognizedThisPeriod,
      memo: "Recognize earned subscription, compute, and license revenue for the close period."
    });
  }
  if (totals.deferredAfterClose > 0) {
    entries.push({
      id: `${input.closeId}-deferred`,
      debit: "cash_or_accounts_receivable",
      credit: "deferred_revenue",
      amount: totals.deferredAfterClose,
      memo: "Carry unearned service and undelivered license value after the close."
    });
  }
  for (const contract of contracts.filter((item) => item.dunning.status === "queued")) {
    entries.push({
      id: `${input.closeId}-${contract.id}-dunning`,
      debit: "collections_queue",
      credit: "accounts_receivable_monitoring",
      amount: contract.payment.receivableAtClose,
      memo: `${contract.customer} queued for ${contract.dunning.action}.`
    });
  }
  return entries;
}

function buildAuditTrail(input, contracts, totals, dunningQueue, holds) {
  const events = [
    {
      type: "close-built",
      closeId: input.closeId,
      contractCount: contracts.length,
      recognizedThisPeriod: totals.recognizedThisPeriod
    }
  ];
  for (const contract of contracts) {
    events.push({
      type: "contract-closed",
      contractId: contract.id,
      stream: contract.stream,
      status: contract.closeStatus,
      method: contract.revenue.method,
      recognizedThisPeriod: contract.revenue.recognizedThisPeriod
    });
  }
  for (const item of dunningQueue) {
    events.push({
      type: "dunning-queued",
      contractId: item.id,
      action: item.dunning.action,
      daysPastDue: item.dunning.daysPastDue
    });
  }
  for (const hold of holds) {
    events.push({
      type: "close-hold",
      contractId: hold.contractId,
      holdType: hold.type,
      amount: hold.amount
    });
  }
  return events;
}

function buildDashboard(input, contracts, totals, dunningQueue, holds) {
  const highPriority = [
    ...dunningQueue.map((contract) => ({
      contractId: contract.id,
      customer: contract.customer,
      owner: contract.dunning.owner,
      nextAction: `${contract.dunning.action} for ${contract.invoiceId || contract.id}`
    })),
    ...holds.map((hold) => ({
      contractId: hold.contractId,
      customer: contractCustomer(contracts, hold.contractId),
      owner: "finance",
      nextAction: hold.recommendedAction
    }))
  ];

  return {
    title: `Revenue close ${input.closeId}`,
    status: highPriority.length === 0 ? "ready-to-certify" : "attention-needed",
    recognizedThisPeriod: totals.recognizedThisPeriod,
    receivableAtClose: totals.receivableAtClose,
    deferredAfterClose: totals.deferredAfterClose,
    dunningCount: dunningQueue.length,
    holdCount: holds.length,
    highPriority
  };
}

function chooseCloseStatus(revenue, payment, dunning, holds) {
  if (holds.length > 0 || dunning.status === "queued") return "attention-needed";
  if (revenue.evidence.length === 0) return "no-period-evidence";
  if (payment.status === "open-receivable") return "closed-with-receivable";
  return "closed";
}

function approvedAdjustments(contract) {
  const credits = (contract.credits || []).filter((credit) => credit.status === "approved");
  const refunds = (contract.refunds || []).filter((refund) => refund.status === "approved");
  return [...credits, ...refunds].reduce((sumValue, item) => sumValue + item.amount, 0);
}

function normalizePolicies(policies) {
  return {
    paymentGraceDays: Number.isFinite(policies.paymentGraceDays) ? policies.paymentGraceDays : 7,
    dunningSteps: Array.isArray(policies.dunningSteps) ? policies.dunningSteps : [],
    recognitionTolerance: Number.isFinite(policies.recognitionTolerance) ? policies.recognitionTolerance : 0.01
  };
}

function parseDate(value) {
  return new Date(`${value}T00:00:00Z`);
}

function parseDateTime(value) {
  return new Date(value);
}

function isInPeriod(value, start, end) {
  return value >= start && value < end;
}

function overlapDays(startA, endA, startB, endB) {
  const start = new Date(Math.max(startA.getTime(), startB.getTime()));
  const end = new Date(Math.min(endA.getTime(), endB.getTime()));
  return Math.max(0, dayDiff(start, end));
}

function dayDiff(start, end) {
  return Math.round((end - start) / 864e5);
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value) {
  return `$${money(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sum(items, select) {
  return items.reduce((total, item) => total + select(item), 0);
}

function contractCustomer(contracts, contractId) {
  const contract = contracts.find((item) => item.id === contractId);
  return contract ? contract.customer : "unknown";
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  buildRevenueClose,
  validateCloseInput,
  closeContract,
  stableDigest
};
