"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = Object.freeze({
  asOf: "2026-05-20",
  maximumAutoCreditCents: 25000,
  maximumAutoNetInvoiceCents: 75000,
  minimumRemainingTermDaysForDowngrade: 30,
  maximumComputeCarryoverRate: 0.5,
  requireQuoteAcceptance: true,
  requireInvoiceForPositiveCharge: true,
});

function evaluatePlanMigrations(input, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...policyOverrides };
  const accounts = new Map((input.accounts || []).map((account) => [account.id, account]));
  const seenInvoiceIds = new Set();
  const evaluations = [];

  for (const migration of input.migrations || []) {
    const account = accounts.get(migration.accountId);
    const findings = [];

    if (!account) {
      findings.push(blocker("missing_account", `No account found for ${migration.accountId}`));
      evaluations.push(buildBlockedEvaluation(migration, findings));
      continue;
    }

    const currentPlan = normalizePlan(migration.currentPlan || account.currentPlan, `${migration.id}:currentPlan`);
    const targetPlan = normalizePlan(migration.targetPlan, `${migration.id}:targetPlan`);
    const term = buildTerm(currentPlan, migration.effectiveAt || policy.asOf);

    if (account.contractStatus && account.contractStatus !== "active") {
      findings.push(blocker("inactive_contract", `Account ${account.id} has contract status ${account.contractStatus}`));
    }

    if (account.currency && targetPlan.currency && account.currency !== targetPlan.currency) {
      findings.push(blocker("currency_mismatch", `Account currency ${account.currency} does not match target ${targetPlan.currency}`));
    }

    if (account.approvedPlanIds && !account.approvedPlanIds.includes(targetPlan.planId)) {
      findings.push(blocker("unapproved_plan", `${targetPlan.planId} is not approved for ${account.id}`));
    }

    if (account.minimumSeats && targetPlan.seats < account.minimumSeats) {
      findings.push(blocker("seat_floor", `${targetPlan.seats} seats is below the contracted floor of ${account.minimumSeats}`));
    }

    if (policy.requireQuoteAcceptance && !migration.quoteAccepted) {
      findings.push(blocker("quote_not_accepted", "Customer quote acceptance is required before migration billing"));
    }

    if (migration.invoiceId) {
      if (seenInvoiceIds.has(migration.invoiceId)) {
        findings.push(blocker("duplicate_invoice", `Invoice ${migration.invoiceId} already appears in this migration batch`));
      }
      seenInvoiceIds.add(migration.invoiceId);
    }

    const currentTermValueCents = planTermValueCents(currentPlan);
    const targetTermValueCents = planTermValueCents(targetPlan);
    const unusedCurrentCreditCents = prorate(currentTermValueCents, term.remainingDays, term.totalDays);
    const targetProratedChargeCents = prorate(targetTermValueCents, term.remainingDays, term.totalDays);
    const netInvoiceCents = Math.max(0, targetProratedChargeCents - unusedCurrentCreditCents);
    const creditMemoCents = Math.max(0, unusedCurrentCreditCents - targetProratedChargeCents);
    const seatDelta = targetPlan.seats - currentPlan.seats;
    const annualizedRevenueDeltaCents = annualizedPlanValue(targetPlan) - annualizedPlanValue(currentPlan);
    const computeCarryoverCents = assertCents(migration.computeCarryoverCents || 0, migration.id, "computeCarryoverCents");
    const maximumComputeCarryoverCents = roundCents(currentPlan.computeCreditCents * policy.maximumComputeCarryoverRate);

    if (policy.requireInvoiceForPositiveCharge && netInvoiceCents > 0 && !migration.invoiceId) {
      findings.push(blocker("missing_invoice", "Positive net invoice requires an invoice id"));
    }

    if (creditMemoCents > policy.maximumAutoCreditCents && !migration.approvalTicket) {
      findings.push(
        hold(
          "credit_approval_required",
          `${money(creditMemoCents)} credit memo exceeds auto-approval limit ${money(policy.maximumAutoCreditCents)}`
        )
      );
    }

    if (netInvoiceCents > policy.maximumAutoNetInvoiceCents && !migration.approvalTicket) {
      findings.push(
        hold(
          "large_invoice_approval_required",
          `${money(netInvoiceCents)} net invoice exceeds auto-approval limit ${money(policy.maximumAutoNetInvoiceCents)}`
        )
      );
    }

    if (seatDelta < 0 && term.remainingDays >= policy.minimumRemainingTermDaysForDowngrade && !migration.approvalTicket) {
      findings.push(
        hold(
          "downgrade_approval_required",
          `Seat reduction of ${Math.abs(seatDelta)} with ${term.remainingDays} days remaining requires approval`
        )
      );
    }

    if (computeCarryoverCents > maximumComputeCarryoverCents) {
      findings.push(
        hold(
          "compute_carryover_cap",
          `Compute carryover ${money(computeCarryoverCents)} exceeds cap ${money(maximumComputeCarryoverCents)}`
        )
      );
    }

    if (currentPlan.interval === "trial" && targetPlan.interval !== "trial" && !migration.paymentReadiness) {
      findings.push(blocker("missing_payment_readiness", "Trial-to-paid migration requires payment readiness evidence"));
    }

    const status = evaluationStatus(findings);
    evaluations.push({
      migrationId: migration.id,
      accountId: account.id,
      accountName: account.name,
      status,
      fromPlanId: currentPlan.planId,
      toPlanId: targetPlan.planId,
      effectiveAt: migration.effectiveAt || policy.asOf,
      invoiceId: migration.invoiceId || null,
      term,
      seatDelta,
      annualizedRevenueDeltaCents,
      unusedCurrentCreditCents,
      targetProratedChargeCents,
      netInvoiceCents: status === "blocked" ? 0 : netInvoiceCents,
      creditMemoCents: status === "blocked" ? 0 : creditMemoCents,
      computeCarryoverCents,
      findings,
      recommendedActions: recommendedActions(status, findings),
    });
  }

  const report = {
    asOf: policy.asOf,
    policy,
    migrationCount: evaluations.length,
    totals: summarize(evaluations),
    evaluations,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function buildBlockedEvaluation(migration, findings) {
  return {
    migrationId: migration.id,
    accountId: migration.accountId,
    accountName: null,
    status: "blocked",
    fromPlanId: null,
    toPlanId: migration.targetPlan ? migration.targetPlan.planId : null,
    effectiveAt: migration.effectiveAt || null,
    invoiceId: migration.invoiceId || null,
    term: { totalDays: 0, remainingDays: 0, elapsedDays: 0 },
    seatDelta: 0,
    annualizedRevenueDeltaCents: 0,
    unusedCurrentCreditCents: 0,
    targetProratedChargeCents: 0,
    netInvoiceCents: 0,
    creditMemoCents: 0,
    computeCarryoverCents: 0,
    findings,
    recommendedActions: recommendedActions("blocked", findings),
  };
}

function normalizePlan(plan, context) {
  if (!plan) {
    throw new Error(`${context} is required`);
  }
  return {
    planId: plan.planId,
    interval: plan.interval || "month",
    currency: plan.currency || "USD",
    seats: assertPositiveInteger(plan.seats, context, "seats"),
    unitPriceCents: assertCents(plan.unitPriceCents, context, "unitPriceCents"),
    computeCreditCents: assertCents(plan.computeCreditCents || 0, context, "computeCreditCents"),
    analyticsLicenseCents: assertCents(plan.analyticsLicenseCents || 0, context, "analyticsLicenseCents"),
    termStart: plan.termStart,
    termEnd: plan.termEnd,
  };
}

function buildTerm(plan, effectiveAt) {
  const termStart = plan.termStart || effectiveAt;
  const termEnd = plan.termEnd || addInterval(termStart, plan.interval);
  const totalDays = Math.max(1, daysBetween(termStart, termEnd));
  const elapsedDays = clamp(daysBetween(termStart, effectiveAt), 0, totalDays);
  const remainingDays = clamp(daysBetween(effectiveAt, termEnd), 0, totalDays);
  return { termStart, termEnd, totalDays, elapsedDays, remainingDays };
}

function planTermValueCents(plan) {
  return plan.unitPriceCents * plan.seats + plan.computeCreditCents + plan.analyticsLicenseCents;
}

function annualizedPlanValue(plan) {
  const termValue = planTermValueCents(plan);
  if (plan.interval === "year") return termValue;
  if (plan.interval === "quarter") return termValue * 4;
  if (plan.interval === "trial") return 0;
  return termValue * 12;
}

function prorate(cents, remainingDays, totalDays) {
  return roundCents((cents * remainingDays) / totalDays);
}

function evaluationStatus(findings) {
  if (findings.some((finding) => finding.severity === "blocker")) return "blocked";
  if (findings.some((finding) => finding.severity === "hold")) return "held";
  return "ready";
}

function summarize(evaluations) {
  const totals = {
    readyCount: 0,
    heldCount: 0,
    blockedCount: 0,
    netInvoiceCents: 0,
    creditMemoCents: 0,
    annualizedRevenueDeltaCents: 0,
    computeCarryoverCents: 0,
  };

  for (const evaluation of evaluations) {
    if (evaluation.status === "ready") totals.readyCount += 1;
    if (evaluation.status === "held") totals.heldCount += 1;
    if (evaluation.status === "blocked") totals.blockedCount += 1;
    totals.netInvoiceCents += evaluation.netInvoiceCents;
    totals.creditMemoCents += evaluation.creditMemoCents;
    totals.annualizedRevenueDeltaCents += evaluation.annualizedRevenueDeltaCents;
    totals.computeCarryoverCents += evaluation.computeCarryoverCents;
  }

  return totals;
}

function recommendedActions(status, findings) {
  if (status === "ready") {
    return ["Finalize migration invoice", "Archive quote, invoice, and audit digest with the account packet"];
  }

  const actions = new Set();
  for (const finding of findings) {
    if (finding.code === "quote_not_accepted") actions.add("Collect signed quote acceptance before migration");
    if (finding.code === "missing_invoice") actions.add("Generate an invoice for the positive net migration charge");
    if (finding.code === "seat_floor") actions.add("Amend the contract or raise target seats to the committed floor");
    if (finding.code === "credit_approval_required") actions.add("Route credit memo for finance approval");
    if (finding.code === "large_invoice_approval_required") actions.add("Route large migration invoice for finance approval");
    if (finding.code === "downgrade_approval_required") actions.add("Collect customer-success approval for mid-term downgrade");
    if (finding.code === "compute_carryover_cap") actions.add("Reduce or separately approve AI compute credit carryover");
    if (finding.code === "duplicate_invoice") actions.add("Reconcile duplicate invoice ids before posting revenue");
    if (finding.code === "missing_payment_readiness") actions.add("Attach payment readiness evidence for trial conversion");
    if (finding.code === "unapproved_plan") actions.add("Confirm the target plan is authorized for this account");
    if (finding.code === "currency_mismatch") actions.add("Requote the migration in the account currency");
    if (finding.code === "inactive_contract") actions.add("Reactivate or renew contract before billing migration");
  }
  return Array.from(actions);
}

function blocker(code, message) {
  return { severity: "blocker", code, message };
}

function hold(code, message) {
  return { severity: "hold", code, message };
}

function assertCents(value, context, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${context} ${field} must be a non-negative integer number of cents`);
  }
  return value;
}

function assertPositiveInteger(value, context, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${context} ${field} must be a positive integer`);
  }
  return value;
}

function roundCents(value) {
  return Math.round(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(start, end) {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error(`Invalid date range ${start} -> ${end}`);
  }
  return Math.round((endMs - startMs) / 86400000);
}

function addInterval(start, interval) {
  const date = new Date(`${start}T00:00:00Z`);
  if (interval === "year") date.setUTCFullYear(date.getUTCFullYear() + 1);
  else if (interval === "quarter") date.setUTCMonth(date.getUTCMonth() + 3);
  else date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function money(cents) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}$${(absolute / 100).toFixed(2)}`;
}

module.exports = {
  DEFAULT_POLICY,
  evaluatePlanMigrations,
  money,
};
