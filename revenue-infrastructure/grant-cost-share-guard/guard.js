"use strict";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value, fieldName) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return date;
}

function inclusiveDays(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

function formatMoney(value) {
  return Number(value.toFixed(2));
}

function evaluateCharge(charge) {
  const reasons = [];
  const actions = [];
  const serviceStart = parseDate(charge.servicePeriod.start, "servicePeriod.start");
  const serviceEnd = parseDate(charge.servicePeriod.end, "servicePeriod.end");
  const awardStart = parseDate(charge.fundingSource.awardStart, "fundingSource.awardStart");
  const awardEnd = parseDate(charge.fundingSource.awardEnd, "fundingSource.awardEnd");

  if (serviceStart > serviceEnd) {
    reasons.push("service_period_invalid");
    actions.push("Correct the service period before billing.");
  }
  if (serviceStart < awardStart || serviceEnd > awardEnd) {
    reasons.push("outside_award_period");
    actions.push("Move charges outside the award dates to unrestricted backup funding.");
  }
  if (!charge.fundingSource.allowedCategories.includes(charge.category)) {
    reasons.push("category_not_allowed");
    actions.push(`Do not charge ${charge.category} to ${charge.fundingSource.id}.`);
  }
  if (charge.requiresPiApproval && !charge.approvals.pi) {
    reasons.push("missing_pi_approval");
    actions.push("Collect PI approval before invoicing this line item.");
  }
  if (charge.requiresDepartmentApproval && !charge.approvals.department) {
    reasons.push("missing_department_approval");
    actions.push("Collect department approval before revenue recognition.");
  }
  if (charge.usage.privateProject && !charge.fundingSource.allowPrivateProjectUsage) {
    reasons.push("private_project_restricted");
    actions.push("Mask or reroute private-project usage away from restricted grant funding.");
  }
  if (charge.usage.commercialPartner && !charge.fundingSource.allowCommercialUse) {
    reasons.push("commercial_use_restricted");
    actions.push("Route commercial partner work to contract or institutional billing.");
  }

  const requestedShare = charge.costShare.requestedAmount;
  const remainingCap = Math.max(0, charge.costShare.cap - charge.costShare.alreadyCommitted);
  if (requestedShare > remainingCap) {
    reasons.push("cost_share_cap_exceeded");
    actions.push("Limit cost-share drawdown to the remaining cap and reroute the excess.");
  }

  const directAmount = charge.amount - charge.indirectCosts.amount;
  if (charge.fundingSource.indirectCostPolicy === "excluded" && charge.indirectCosts.amount > 0) {
    reasons.push("indirect_costs_excluded");
    actions.push("Strip indirect costs from the grant-funded invoice line.");
  }
  if (
    charge.fundingSource.indirectCostPolicy === "capped" &&
    charge.indirectCosts.rate > charge.fundingSource.indirectCostRateCap
  ) {
    reasons.push("indirect_rate_above_cap");
    actions.push("Apply the negotiated indirect-cost cap before billing.");
  }

  const serviceDays = inclusiveDays(serviceStart, serviceEnd);
  const approvedCostShare = Math.min(requestedShare, remainingCap);
  const heldAmount = reasons.length === 0 ? 0 : charge.amount;
  const rerouteAmount = reasons.includes("cost_share_cap_exceeded")
    ? formatMoney(requestedShare - remainingCap)
    : 0;

  return {
    id: charge.id,
    institution: charge.institution,
    category: charge.category,
    decision: reasons.length === 0 ? "approve" : "hold",
    reasons,
    actions,
    amounts: {
      requested: formatMoney(charge.amount),
      direct: formatMoney(directAmount),
      indirect: formatMoney(charge.indirectCosts.amount),
      approvedCostShare: formatMoney(approvedCostShare),
      held: formatMoney(heldAmount),
      reroute: formatMoney(rerouteAmount),
    },
    evidence: {
      serviceDays,
      award: charge.fundingSource.id,
      backupBillingSource: charge.backupBillingSource,
      auditDigest: buildAuditDigest(charge, reasons),
    },
  };
}

function buildAuditDigest(charge, reasons) {
  const source = [
    charge.id,
    charge.institution,
    charge.category,
    charge.amount,
    charge.fundingSource.id,
    reasons.join("|"),
  ].join(":");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function evaluateCharges(charges) {
  return charges.map(evaluateCharge);
}

function summarizeDecisions(decisions) {
  return decisions.reduce(
    (summary, decision) => {
      summary.total += 1;
      summary[decision.decision] += 1;
      summary.heldAmount = formatMoney(summary.heldAmount + decision.amounts.held);
      summary.rerouteAmount = formatMoney(summary.rerouteAmount + decision.amounts.reroute);
      return summary;
    },
    { total: 0, approve: 0, hold: 0, heldAmount: 0, rerouteAmount: 0 },
  );
}

module.exports = {
  evaluateCharge,
  evaluateCharges,
  summarizeDecisions,
};
