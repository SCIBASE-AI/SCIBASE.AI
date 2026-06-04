const REQUIRED_EVIDENCE = {
  base: ["usage-meter-export", "signed-amendment"],
  overage: "overage-approval",
  slaCredit: "sla-credit-ticket",
};

const ACTIONS = {
  release: "RELEASE_INVOICE",
  review: "REVIEW_BEFORE_RELEASE",
  hold: "HOLD_INVOICE",
};

function centsToDollars(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function parseDate(value, fieldName) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return date;
}

function isDateWithin(value, start, end) {
  const date = parseDate(value, "date");
  return date >= parseDate(start, "periodStart") && date <= parseDate(end, "periodEnd");
}

function getEffectiveCommitment(contract, invoice) {
  const amendments = Array.isArray(contract.signedAmendments) ? contract.signedAmendments : [];
  const eligible = amendments
    .filter((amendment) => amendment.signedAt)
    .filter((amendment) => isDateWithin(amendment.effectiveDate, invoice.periodStart, invoice.periodEnd))
    .sort((a, b) => parseDate(b.effectiveDate, "effectiveDate") - parseDate(a.effectiveDate, "effectiveDate"));

  return eligible[0]?.minimumCommitmentCents ?? contract.minimumCommitmentCents;
}

function expectedTrueUpCents(invoice, effectiveCommitmentCents) {
  const gross = invoice.meteredUsageCents - effectiveCommitmentCents;
  const overage = gross > 0 ? gross : 0;
  const floorCatchUp = gross < 0 ? Math.abs(gross) : 0;
  return Math.max(0, overage + floorCatchUp - invoice.slaCreditCents);
}

function addFinding(findings, severity, code, message, amountCents = 0) {
  findings.push({ severity, code, message, amountCents });
}

function evaluateInvoice(contract, invoice, seenWindows) {
  const findings = [];
  const evidence = new Set(invoice.evidence || []);
  const effectiveCommitmentCents = getEffectiveCommitment(contract, invoice);
  const expectedTrueUp = expectedTrueUpCents(invoice, effectiveCommitmentCents);
  const variance = invoice.proposedTrueUpCents - expectedTrueUp;

  for (const required of REQUIRED_EVIDENCE.base) {
    if (!evidence.has(required)) {
      addFinding(findings, "hold", "MISSING_BASE_EVIDENCE", `${required} evidence is required before release`);
    }
  }

  if (seenWindows.has(invoice.trueUpWindow)) {
    addFinding(findings, "hold", "DUPLICATE_TRUEUP_WINDOW", `${invoice.trueUpWindow} is already represented by another invoice`);
  }
  seenWindows.add(invoice.trueUpWindow);

  if (variance !== 0) {
    addFinding(
      findings,
      Math.abs(variance) >= 50000 ? "hold" : "review",
      "TRUEUP_VARIANCE",
      `Proposed true-up ${centsToDollars(invoice.proposedTrueUpCents)} differs from expected ${centsToDollars(expectedTrueUp)}`,
      variance
    );
  }

  if (invoice.meteredUsageCents > effectiveCommitmentCents && !evidence.has(REQUIRED_EVIDENCE.overage)) {
    addFinding(findings, "hold", "MISSING_OVERAGE_APPROVAL", "Overage billing requires approval evidence");
  }

  if (invoice.slaCreditCents > 0 && !evidence.has(REQUIRED_EVIDENCE.slaCredit)) {
    addFinding(findings, "review", "MISSING_SLA_TICKET", "SLA credit needs an incident or support ticket reference");
  }

  if (invoice.slaCreditCents > invoice.slaCreditCapCents) {
    addFinding(
      findings,
      "hold",
      "SLA_CREDIT_EXCEEDS_CAP",
      `SLA credit ${centsToDollars(invoice.slaCreditCents)} exceeds cap ${centsToDollars(invoice.slaCreditCapCents)}`,
      invoice.slaCreditCents - invoice.slaCreditCapCents
    );
  }

  const hasOnlyFutureAmendment = (contract.signedAmendments || []).some(
    (amendment) =>
      amendment.signedAt &&
      parseDate(amendment.effectiveDate, "effectiveDate") > parseDate(invoice.periodEnd, "periodEnd") &&
      amendment.minimumCommitmentCents !== contract.minimumCommitmentCents
  );

  if (hasOnlyFutureAmendment && invoice.proposedTrueUpCents < expectedTrueUp) {
    addFinding(findings, "hold", "FUTURE_AMENDMENT_APPLIED_EARLY", "Invoice appears to use a future amendment before its effective date");
  }

  return {
    contractId: contract.contractId,
    invoiceId: invoice.invoiceId,
    trueUpWindow: invoice.trueUpWindow,
    customerSegment: contract.customerSegment,
    effectiveCommitmentCents,
    meteredUsageCents: invoice.meteredUsageCents,
    proposedTrueUpCents: invoice.proposedTrueUpCents,
    expectedTrueUpCents: expectedTrueUp,
    varianceCents: variance,
    findings,
  };
}

function decideAction(findings) {
  if (findings.some((finding) => finding.severity === "hold")) {
    return ACTIONS.hold;
  }
  if (findings.some((finding) => finding.severity === "review")) {
    return ACTIONS.review;
  }
  return ACTIONS.release;
}

function riskScore(findings) {
  return findings.reduce((score, finding) => score + (finding.severity === "hold" ? 40 : 15), 0);
}

function evaluateContract(contract) {
  const seenWindows = new Set();
  const invoices = contract.invoices.map((invoice) => {
    const result = evaluateInvoice(contract, invoice, seenWindows);
    return {
      ...result,
      action: decideAction(result.findings),
      riskScore: riskScore(result.findings),
    };
  });

  const contractAction = decideAction(invoices.flatMap((invoice) => invoice.findings));

  return {
    contractId: contract.contractId,
    customerSegment: contract.customerSegment,
    currency: contract.currency,
    action: contractAction,
    invoices,
  };
}

function summarize(evaluations) {
  const summary = {
    contracts: evaluations.length,
    invoices: 0,
    release: 0,
    review: 0,
    hold: 0,
    totalVarianceCents: 0,
    topFindings: {},
  };

  for (const contract of evaluations) {
    for (const invoice of contract.invoices) {
      summary.invoices += 1;
      summary.totalVarianceCents += Math.abs(invoice.varianceCents);
      if (invoice.action === ACTIONS.release) summary.release += 1;
      if (invoice.action === ACTIONS.review) summary.review += 1;
      if (invoice.action === ACTIONS.hold) summary.hold += 1;

      for (const finding of invoice.findings) {
        summary.topFindings[finding.code] = (summary.topFindings[finding.code] || 0) + 1;
      }
    }
  }

  return summary;
}

function evaluatePortfolio(portfolio) {
  const evaluations = portfolio.contracts.map(evaluateContract);
  return {
    generatedAt: new Date().toISOString(),
    portfolio: portfolio.portfolio,
    summary: summarize(evaluations),
    evaluations,
  };
}

module.exports = {
  ACTIONS,
  centsToDollars,
  evaluatePortfolio,
  expectedTrueUpCents,
};
