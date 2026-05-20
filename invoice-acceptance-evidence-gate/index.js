const crypto = require("node:crypto");

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(startIso, endIso) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / DAY_MS));
}

function money(value) {
  return Number((value || 0).toFixed(2));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex").slice(0, 16);
}

function evidenceByKey(evidenceItems) {
  return new Map((evidenceItems || []).map((item) => [item.key, item]));
}

function evidenceStatus(requiredKeys, evidenceItems) {
  const byKey = evidenceByKey(evidenceItems);
  return requiredKeys.map((key) => {
    const found = byKey.get(key);
    return {
      key,
      status: found ? found.status : "missing",
      source: found ? found.source : null,
      owner: found ? found.owner : null,
      observedAt: found ? found.observedAt : null,
      note: found ? found.note : "Required evidence has not been attached",
    };
  });
}

function classifyEvent(event, account, policy, asOf) {
  const required = event.requiredEvidence || [];
  const statuses = evidenceStatus(required, account.evidence);
  const missing = statuses.filter((item) => item.status === "missing");
  const rejected = statuses.filter((item) => item.status === "rejected");
  const pending = statuses.filter((item) => item.status === "pending");
  const approved = statuses.filter((item) => item.status === "approved");
  const eventAgeDays = daysBetween(event.periodEnd || event.createdAt, asOf);
  const evidenceScore = required.length === 0 ? 100 : Math.round((approved.length / required.length) * 100);
  const reasons = [];

  if (event.complianceHold) reasons.push("compliance_hold");
  if (rejected.length) reasons.push("rejected_evidence");
  if (missing.length) reasons.push("missing_evidence");
  if (pending.length) reasons.push("pending_acceptance");
  if (evidenceScore < policy.minimumEvidenceScore && pending.length === 0) {
    reasons.push("evidence_score_below_policy");
  }
  if (eventAgeDays >= policy.agingRiskDays && (missing.length || pending.length || rejected.length)) {
    reasons.push("aging_unbilled_revenue");
  }

  let readiness = "ready_to_invoice";
  if (event.complianceHold || rejected.length || missing.length) {
    readiness = "blocked";
  } else if (pending.length || evidenceScore < policy.minimumEvidenceScore) {
    readiness = "needs_review";
  }

  const riskWeight = readiness === "blocked" ? 1 : readiness === "needs_review" ? 0.45 : 0;
  const agingWeight = Math.min(1, eventAgeDays / Math.max(policy.agingRiskDays, 1));
  const leakageRisk = money(event.amount * riskWeight * (0.65 + agingWeight * 0.35));

  return {
    accountId: account.accountId,
    accountName: account.accountName,
    eventId: event.id,
    revenueStream: event.revenueStream,
    amount: money(event.amount),
    currency: account.currency,
    readiness,
    evidenceScore,
    eventAgeDays,
    leakageRisk,
    reasons,
    evidence: statuses,
    recommendedAction: recommendedAction(readiness, reasons, event),
  };
}

function recommendedAction(readiness, reasons, event) {
  if (readiness === "ready_to_invoice") {
    return `Create invoice for ${event.id} and attach the approved acceptance packet.`;
  }
  if (reasons.includes("rejected_evidence")) {
    return `Resolve rejected acceptance artifact before invoicing ${event.id}.`;
  }
  if (reasons.includes("missing_evidence")) {
    return `Collect missing customer evidence for ${event.id}: ${(event.requiredEvidence || []).join(", ")}.`;
  }
  if (reasons.includes("pending_acceptance")) {
    return `Escalate pending customer acceptance for ${event.id} to the named owner.`;
  }
  if (reasons.includes("compliance_hold")) {
    return `Keep ${event.id} out of invoice run until compliance hold is cleared.`;
  }
  return `Route ${event.id} to finance review.`;
}

function summarizeRows(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.count += 1;
      summary.totalAmount = money(summary.totalAmount + row.amount);
      summary.totalLeakageRisk = money(summary.totalLeakageRisk + row.leakageRisk);
      summary.byReadiness[row.readiness] = money((summary.byReadiness[row.readiness] || 0) + row.amount);
      summary.byRevenueStream[row.revenueStream] = money((summary.byRevenueStream[row.revenueStream] || 0) + row.amount);
      return summary;
    },
    { count: 0, totalAmount: 0, totalLeakageRisk: 0, byReadiness: {}, byRevenueStream: {} },
  );
}

function buildActionQueue(rows) {
  return rows
    .filter((row) => row.readiness !== "ready_to_invoice")
    .sort((a, b) => b.leakageRisk - a.leakageRisk || b.amount - a.amount)
    .map((row, index) => ({
      rank: index + 1,
      accountId: row.accountId,
      eventId: row.eventId,
      readiness: row.readiness,
      leakageRisk: row.leakageRisk,
      reasons: row.reasons,
      action: row.recommendedAction,
    }));
}

function evaluateInvoiceAcceptance(accounts, options = {}) {
  const asOf = options.asOf || new Date().toISOString();
  const policy = {
    minimumEvidenceScore: options.minimumEvidenceScore ?? 100,
    agingRiskDays: options.agingRiskDays ?? 14,
  };
  const rows = [];

  for (const account of accounts) {
    for (const event of account.billingEvents || []) {
      rows.push(classifyEvent(event, account, policy, asOf));
    }
  }

  const summary = summarizeRows(rows);
  const actionQueue = buildActionQueue(rows);
  const auditDigest = digest({
    asOf,
    policy,
    rows: rows.map((row) => ({
      accountId: row.accountId,
      eventId: row.eventId,
      readiness: row.readiness,
      evidenceScore: row.evidenceScore,
      leakageRisk: row.leakageRisk,
      reasons: row.reasons,
    })),
  });

  return {
    asOf,
    policy,
    summary,
    rows,
    actionQueue,
    auditDigest,
  };
}

module.exports = {
  evaluateInvoiceAcceptance,
  digest,
  daysBetween,
};
