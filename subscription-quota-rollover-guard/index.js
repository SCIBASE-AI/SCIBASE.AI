const SEVERITY_ORDER = { block: 3, warn: 2, info: 1 };

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function cycleToNumber(cycle) {
  const match = String(cycle || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 12 + Number(match[2]);
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export function auditQuotaRollover(ledger) {
  if (!ledger || typeof ledger !== "object") {
    throw new TypeError("quota ledger must be an object");
  }

  const issues = [];
  const plan = ledger.plan || {};
  const prior = ledger.priorCycle || {};
  const current = ledger.currentCycle || {};
  const lots = ledger.rolloverLots || [];
  const adjustments = ledger.adjustments || [];
  const invoice = ledger.invoicePreview || {};

  if (prior.carryForwardUnits > plan.rolloverCapUnits) {
    issues.push(
      finding(
        "ROLLOVER_CAP_EXCEEDED",
        "block",
        "Prior-cycle unused quota exceeds the contractual rollover cap.",
        {
          carryForwardUnits: prior.carryForwardUnits,
          rolloverCapUnits: plan.rolloverCapUnits,
        },
        "Clamp carry-forward units to the plan cap and regenerate the invoice preview before release.",
      ),
    );
  }

  if (prior.postedRolloverUnits !== prior.carryForwardUnits) {
    issues.push(
      finding(
        "POSTED_ROLLOVER_MISMATCH",
        "block",
        "Posted rollover units do not match the calculated prior-cycle carry-forward units.",
        {
          postedRolloverUnits: prior.postedRolloverUnits,
          carryForwardUnits: prior.carryForwardUnits,
        },
        "Reconcile the quota ledger before overage or credit lines are posted.",
      ),
    );
  }

  const seenLots = new Set();
  for (const lot of lots) {
    if (seenLots.has(lot.lotId)) {
      issues.push(
        finding(
          "DUPLICATE_ROLLOVER_LOT",
          "block",
          "The same rollover lot appears more than once and could be carried forward twice.",
          { lotId: lot.lotId },
          "Deduplicate rollover lots by immutable lot id before invoice generation.",
        ),
      );
    }
    seenLots.add(lot.lotId);

    if (cycleToNumber(lot.expiresAfterCycle) < cycleToNumber(ledger.billingCycle) && lot.appliedUnits > 0) {
      issues.push(
        finding(
          "EXPIRED_ROLLOVER_APPLIED",
          "block",
          "Expired quota was applied to the current invoice.",
          {
            lotId: lot.lotId,
            expiresAfterCycle: lot.expiresAfterCycle,
            billingCycle: ledger.billingCycle,
            appliedUnits: lot.appliedUnits,
          },
          "Remove expired lots from available balance and route the invoice to finance review.",
        ),
      );
    }
  }

  const totalAppliedFromLots = sum(lots.map((lot) => lot.appliedUnits));
  if (totalAppliedFromLots !== current.rolloverAppliedUnits) {
    issues.push(
      finding(
        "ROLLOVER_APPLICATION_MISMATCH",
        "block",
        "Applied rollover units do not equal the sum of applied rollover lots.",
        {
          totalAppliedFromLots,
          rolloverAppliedUnits: current.rolloverAppliedUnits,
        },
        "Regenerate applied quota from lot-level records instead of invoice-line totals.",
      ),
    );
  }

  if (current.planChangedFrom !== current.planChangedTo && current.rolloverAppliedUnits > plan.downgradeCarryLimitUnits) {
    issues.push(
      finding(
        "DOWNGRADE_CARRY_LIMIT_EXCEEDED",
        "block",
        "A downgraded account is applying more carried quota than the downgrade policy allows.",
        {
          planChangedFrom: current.planChangedFrom,
          planChangedTo: current.planChangedTo,
          rolloverAppliedUnits: current.rolloverAppliedUnits,
          downgradeCarryLimitUnits: plan.downgradeCarryLimitUnits,
        },
        "Apply the downgrade carry limit or hold the invoice for contract review.",
      ),
    );
  }

  const unapprovedNegativeAdjustments = adjustments.filter((adjustment) => adjustment.units < 0 && !adjustment.approvedByFinance);
  if (unapprovedNegativeAdjustments.length > 0) {
    issues.push(
      finding(
        "UNAPPROVED_NEGATIVE_ADJUSTMENT",
        "warn",
        "Negative quota adjustments exist without finance approval.",
        { adjustmentIds: unapprovedNegativeAdjustments.map((adjustment) => adjustment.adjustmentId) },
        "Require finance approval before negative units affect quota or invoice totals.",
      ),
    );
  }

  const expectedOverageUnits = Math.max(0, current.usageUnits - current.includedUnits - current.rolloverAppliedUnits);
  if (invoice.lineItems?.some((line) => line.code === "ai-compute-overage") && current.invoiceOverageUnits !== expectedOverageUnits) {
    issues.push(
      finding(
        "OVERAGE_DOUBLE_BILLING_RISK",
        "block",
        "Invoice overage units do not subtract applied rollover correctly.",
        {
          usageUnits: current.usageUnits,
          includedUnits: current.includedUnits,
          rolloverAppliedUnits: current.rolloverAppliedUnits,
          invoiceOverageUnits: current.invoiceOverageUnits,
          expectedOverageUnits,
        },
        "Recompute overage after rollover application to prevent double billing.",
      ),
    );
  }

  if (issues.some((issue) => issue.severity === "block") && invoice.reviewerHold !== true) {
    issues.push(
      finding(
        "MISSING_FINANCE_HOLD",
        "block",
        "The invoice preview is not on hold despite quota rollover blockers.",
        { reviewerHold: invoice.reviewerHold },
        "Place the invoice on finance hold until quota carry-forward and overage lines reconcile.",
      ),
    );
  }

  const blockCount = issues.filter((issue) => issue.severity === "block").length;
  const warnCount = issues.filter((issue) => issue.severity === "warn").length;
  return {
    accountId: ledger.accountId,
    billingCycle: ledger.billingCycle,
    decision: blockCount > 0 ? "hold-invoice" : warnCount > 0 ? "finance-review" : "ready-to-invoice",
    riskScore: Math.min(100, blockCount * 24 + warnCount * 9),
    summary: {
      blockCount,
      warnCount,
      findingCount: issues.length,
      appliedRolloverUnits: current.rolloverAppliedUnits || 0,
      expectedOverageUnits,
    },
    findings: issues.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || a.code.localeCompare(b.code)),
  };
}

export function buildFinanceMarkdown(report) {
  const lines = [
    `# Subscription Quota Rollover Guard: ${report.accountId}`,
    "",
    `Billing cycle: **${report.billingCycle}**`,
    `Decision: **${report.decision}**`,
    `Risk score: **${report.riskScore}/100**`,
    "",
    `Findings: ${report.summary.blockCount} blockers, ${report.summary.warnCount} warnings.`,
    `Applied rollover units: ${report.summary.appliedRolloverUnits}`,
    `Expected overage units: ${report.summary.expectedOverageUnits}`,
    "",
  ];

  for (const item of report.findings) {
    lines.push(`## ${item.severity.toUpperCase()}: ${item.code}`);
    lines.push(item.message);
    lines.push("");
    lines.push(`Evidence: \`${JSON.stringify(item.evidence)}\``);
    lines.push("");
    lines.push(`Remediation: ${item.remediation}`);
    lines.push("");
  }

  if (report.findings.length === 0) {
    lines.push("No rollover blockers or warnings were detected in the synthetic ledger.");
    lines.push("");
  }

  return lines.join("\n");
}

export function buildSummarySvg(report) {
  const color = report.decision === "hold-invoice" ? "#dc2626" : report.decision === "finance-review" ? "#d97706" : "#16a34a";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="420" viewBox="0 0 920 420" role="img" aria-label="Subscription quota rollover guard summary">
  <rect width="920" height="420" fill="#111827"/>
  <text x="52" y="68" fill="#f9fafb" font-family="Arial, sans-serif" font-size="30" font-weight="700">Subscription Quota Rollover Guard</text>
  <text x="52" y="108" fill="#d1d5db" font-family="Arial, sans-serif" font-size="17">${escapeXml(report.accountId)} · ${escapeXml(report.billingCycle)}</text>
  <rect x="52" y="144" width="760" height="34" rx="5" fill="#1f2937" stroke="#374151"/>
  <rect x="52" y="144" width="${Math.min(760, report.riskScore * 7.6)}" height="34" rx="5" fill="${color}"/>
  <text x="835" y="169" fill="#f9fafb" font-family="Arial, sans-serif" font-size="20" text-anchor="end">${report.riskScore}/100</text>
  <g transform="translate(52 230)">
    <rect width="230" height="110" rx="8" fill="#1f2937"/>
    <text x="24" y="44" fill="#fecaca" font-family="Arial, sans-serif" font-size="30" font-weight="700">${report.summary.blockCount}</text>
    <text x="24" y="78" fill="#d1d5db" font-family="Arial, sans-serif" font-size="16">invoice blockers</text>
  </g>
  <g transform="translate(318 230)">
    <rect width="230" height="110" rx="8" fill="#1f2937"/>
    <text x="24" y="44" fill="#fde68a" font-family="Arial, sans-serif" font-size="30" font-weight="700">${report.summary.appliedRolloverUnits}</text>
    <text x="24" y="78" fill="#d1d5db" font-family="Arial, sans-serif" font-size="16">applied rollover units</text>
  </g>
  <g transform="translate(584 230)">
    <rect width="230" height="110" rx="8" fill="#1f2937"/>
    <text x="24" y="44" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="30" font-weight="700">${report.summary.expectedOverageUnits}</text>
    <text x="24" y="78" fill="#d1d5db" font-family="Arial, sans-serif" font-size="16">expected overage units</text>
  </g>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
