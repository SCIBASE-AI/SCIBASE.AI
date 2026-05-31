const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error(`Invalid date: ${value}`);
  }
  return new Date(time);
}

function daysBetween(start, end) {
  return Math.ceil((parseDate(end) - parseDate(start)) / MS_PER_DAY);
}

function addFinding(findings, severity, id, message, action, evidence = {}) {
  findings.push({ severity, id, message, action, evidence });
}

function evaluateCancellationPacket(packet) {
  const findings = [];
  const noticeDays = daysBetween(packet.requestedAt, packet.contractEndDate);

  if (noticeDays < packet.requiredNoticeDays) {
    addFinding(
      findings,
      "hold",
      "late-cancellation-notice",
      `Cancellation notice provides ${noticeDays} days, below the required ${packet.requiredNoticeDays} days.`,
      "Route to finance/legal for late-notice approval before suppressing renewal revenue.",
      { noticeDays, requiredNoticeDays: packet.requiredNoticeDays }
    );
  }

  if (packet.effectiveDate !== packet.contractEndDate && !packet.earlyTerminationApprovalId) {
    addFinding(
      findings,
      "block",
      "unapproved-effective-date",
      "Cancellation effective date differs from the contract end date without early-termination approval.",
      "Attach early-termination approval or align the effective date with the contract end date.",
      { effectiveDate: packet.effectiveDate, contractEndDate: packet.contractEndDate }
    );
  }

  for (const invoice of packet.renewalInvoices || []) {
    if (invoice.status === "scheduled" && Date.parse(invoice.issueDate) >= Date.parse(packet.effectiveDate)) {
      addFinding(
        findings,
        "block",
        `scheduled-renewal-invoice:${invoice.id}`,
        `Renewal invoice ${invoice.id} is still scheduled after cancellation takes effect.`,
        "Cancel or hold the renewal invoice before finalizing the cancellation.",
        invoice
      );
    }
  }

  if (packet.refundDueCents > 0 && !packet.financeReviewId) {
    addFinding(
      findings,
      "hold",
      "refund-without-review",
      "A refund or service credit is due but no finance review is attached.",
      "Create a finance review before issuing credit notes or refund payments.",
      { refundDueCents: packet.refundDueCents }
    );
  }

  for (const creditLot of packet.computeCreditLots || []) {
    if (creditLot.remainingUnits > 0 && Date.parse(creditLot.expiresAt) > Date.parse(packet.computeWindDownDate)) {
      addFinding(
        findings,
        "hold",
        `compute-credit-overhang:${creditLot.id}`,
        `Compute credit lot ${creditLot.id} remains usable after the wind-down date.`,
        "Expire, refund, or convert the remaining compute credits before cancellation close.",
        creditLot
      );
    }
  }

  for (const exportGrant of packet.analyticsExportGrants || []) {
    if (Date.parse(exportGrant.accessUntil) > Date.parse(packet.analyticsCutoffDate)) {
      addFinding(
        findings,
        "block",
        `analytics-export-overhang:${exportGrant.id}`,
        `Analytics export grant ${exportGrant.id} outlives the cancellation cutoff.`,
        "Revoke or shorten export access before confirming cancellation.",
        exportGrant
      );
    }
  }

  if (packet.institutionalPoException && !packet.poCloseoutId) {
    addFinding(
      findings,
      "hold",
      "po-closeout-missing",
      "Institutional purchase-order exception is present without a closeout record.",
      "Attach PO closeout evidence before marking the account cancelled.",
      { institutionalPoException: true }
    );
  }

  const blockers = findings.filter((finding) => finding.severity === "block").length;
  const holds = findings.filter((finding) => finding.severity === "hold").length;
  const warnings = findings.filter((finding) => finding.severity === "warn").length;

  return {
    accountId: packet.accountId,
    cancellationId: packet.cancellationId,
    decision: blockers > 0 ? "block-cancellation-close" : holds > 0 ? "hold-for-finance-review" : "ready-to-close",
    summary: { blockers, holds, warnings, findings: findings.length },
    findings
  };
}

function toMarkdown(result) {
  const rows = result.findings.map((finding) => `| ${finding.severity} | ${finding.message} | ${finding.action} |`);
  return [
    "# Cancellation Effective-Date Guard Report",
    "",
    `Account: ${result.accountId}`,
    `Cancellation: ${result.cancellationId}`,
    `Decision: ${result.decision}`,
    "",
    "| Severity | Finding | Action |",
    "| --- | --- | --- |",
    ...(rows.length ? rows : ["| ok | No issues found. | Close cancellation packet. |"]),
    ""
  ].join("\n");
}

function toSvg(result) {
  const color = result.decision === "ready-to-close" ? "#0f7b45" : result.decision === "hold-for-finance-review" ? "#9a6700" : "#b42318";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="220" viewBox="0 0 760 220" role="img" aria-label="Cancellation guard summary">`,
    `<rect width="760" height="220" fill="#f8fafc"/>`,
    `<rect x="30" y="28" width="700" height="164" rx="8" fill="#ffffff" stroke="#d0d7de"/>`,
    `<text x="54" y="72" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">Cancellation Effective-Date Guard</text>`,
    `<text x="54" y="112" font-family="Arial, sans-serif" font-size="18" fill="${color}">Decision: ${result.decision}</text>`,
    `<text x="54" y="146" font-family="Arial, sans-serif" font-size="16" fill="#374151">Blockers: ${result.summary.blockers} | Holds: ${result.summary.holds} | Warnings: ${result.summary.warnings}</text>`,
    `<text x="54" y="174" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">Account ${result.accountId} / ${result.cancellationId}</text>`,
    `</svg>`
  ].join("\n");
}

module.exports = {
  evaluateCancellationPacket,
  toMarkdown,
  toSvg
};
