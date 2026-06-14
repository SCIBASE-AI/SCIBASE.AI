function evaluateChargeback(record) {
  const blockers = [];
  const warnings = [];

  if (!record.costCenterActive) blockers.push("inactive cost center");
  if (!record.piApproval) blockers.push("missing PI approval");
  if (!record.grantAllowsCharge) blockers.push("grant does not allow this charge");
  if (!record.categoryAllowed) blockers.push("expense category not allowed");
  if (!record.projectActive) blockers.push("project is not active");
  if (!record.usageEvidence) blockers.push("missing usage evidence");
  if (!record.dataResidencyOk) blockers.push("data residency mismatch");

  if (record.amount > record.remainingBudget && !record.overageApproval) {
    blockers.push("charge exceeds remaining budget without overage approval");
  } else if (record.amount > record.remainingBudget) {
    warnings.push("charge exceeds remaining budget but has overage approval");
  }

  if (!record.purchaseOrder) warnings.push("no purchase order attached");
  if (!record.taxCode) warnings.push("missing tax code");

  let decision = "APPROVE_CHARGEBACK";
  if (blockers.length) {
    decision = "BLOCK_CHARGEBACK";
  } else if (warnings.length) {
    decision = "ROUTE_FOR_APPROVAL";
  }

  return {
    recordId: record.id,
    department: record.department,
    amount: record.amount,
    decision,
    blockers,
    warnings,
    nextStep: nextStepFor(decision),
  };
}

function nextStepFor(decision) {
  if (decision === "APPROVE_CHARGEBACK") return "post the chargeback to the institution ledger";
  if (decision === "ROUTE_FOR_APPROVAL") return "send to finance for a manual approval pass";
  return "do not post until blockers are fixed";
}

function evaluateChargebacks(records) {
  return records.map(evaluateChargeback);
}

function renderMarkdownReport(results) {
  const lines = ["# Enterprise cost center chargeback report", ""];
  for (const result of results) {
    lines.push(`## ${result.recordId}: ${result.department}`);
    lines.push(`Amount: ${result.amount}`);
    lines.push(`Decision: ${result.decision}`);
    lines.push(`Next step: ${result.nextStep}`);
    if (result.blockers.length) {
      lines.push("Blockers:");
      for (const blocker of result.blockers) lines.push(`- ${blocker}`);
    }
    if (result.warnings.length) {
      lines.push("Warnings:");
      for (const warning of result.warnings) lines.push(`- ${warning}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

module.exports = {
  evaluateChargeback,
  evaluateChargebacks,
  renderMarkdownReport,
};
