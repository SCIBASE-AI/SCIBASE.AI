"use strict";

const crypto = require("crypto");

const WEIGHTS = {
  critical: 26,
  high: 18,
  medium: 10,
  low: 5,
};

function cents(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function money(centsValue) {
  return `$${(centsValue / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || "medium",
    recommendation: recommendationFor(finding.code),
    ...finding,
  });
}

function recommendationFor(code) {
  const recommendations = {
    USAGE_NOT_BILLED: "Backfill usage into the current invoice preview or create an adjustment line.",
    OVER_QUOTA_NOT_BLOCKED: "Enforce compute quota gates before allowing additional jobs.",
    DISCOUNT_EXCEEDS_POLICY: "Require revenue-ops approval for discount overrides above policy.",
    INSTITUTIONAL_PO_MISSING: "Hold invoice finalization until purchase order metadata is attached.",
    LICENSED_API_OVERAGE: "Bill analytics API overage or throttle the license key.",
    FREE_TRIAL_COMPUTE_LEAK: "Block paid compute features when trial entitlements are exhausted.",
    PLAN_ENTITLEMENT_MISMATCH: "Reconcile plan entitlements with subscription tier before charging usage.",
    TOPUP_DOUBLE_COUNTED: "Deduplicate top-up credits before producing quota or invoice totals.",
    PRIVATE_CONTENT_LICENSED: "Remove private-content fields from analytics licensing exports.",
    PAYMENT_PROVIDER_DRIFT: "Reconcile Stripe, PayPal, and invoice ledger totals before revenue close.",
  };
  return recommendations[code] || "Route this item to revenue operations.";
}

function auditUsageMetering(account) {
  const findings = [];
  const plan = account.plan || {};
  const invoices = account.invoices || [];
  const usageEvents = account.usageEvents || [];
  const topups = account.topups || [];
  const licensingExports = account.licensingExports || [];

  const effectiveComputeQuota = (plan.computeUnitQuota || 0) + dedupedTopups(topups).reduce((sum, topup) => sum + topup.computeUnits, 0);
  const totalComputeUnits = usageEvents
    .filter((event) => event.meter === "ai_compute")
    .reduce((sum, event) => sum + event.units, 0);
  const billedUsageIds = new Set(invoices.flatMap((invoice) => invoice.usageEventIds || []));

  for (const event of usageEvents) {
    if (event.billable && !billedUsageIds.has(event.id)) {
      addFinding(findings, {
        code: "USAGE_NOT_BILLED",
        severity: event.units > 100 ? "high" : "medium",
        eventId: event.id,
        message: `${event.id} is billable but missing from invoice usage references.`,
        evidence: event,
      });
    }

    if (event.meter === "ai_compute" && event.accountState === "trial" && event.units > (plan.trialComputeUnitsRemaining || 0)) {
      addFinding(findings, {
        code: "FREE_TRIAL_COMPUTE_LEAK",
        severity: "high",
        eventId: event.id,
        message: `${event.id} consumed paid compute beyond trial entitlement.`,
        evidence: { event, trialRemaining: plan.trialComputeUnitsRemaining || 0 },
      });
    }

    if (event.meter === "analytics_api" && event.units > (plan.analyticsApiMonthlyLimit || 0) && !event.overageBilled) {
      addFinding(findings, {
        code: "LICENSED_API_OVERAGE",
        severity: "high",
        eventId: event.id,
        message: `${event.id} exceeded licensed analytics API allowance without overage billing.`,
        evidence: event,
      });
    }
  }

  if (totalComputeUnits > effectiveComputeQuota && !account.enforcement?.computeHardLimitEnabled) {
    addFinding(findings, {
      code: "OVER_QUOTA_NOT_BLOCKED",
      severity: "critical",
      message: `Compute usage ${totalComputeUnits} exceeds quota ${effectiveComputeQuota} without hard-limit enforcement.`,
      evidence: { totalComputeUnits, effectiveComputeQuota, enforcement: account.enforcement },
    });
  }

  if (plan.tier === "lab" && plan.privateProjectLimit < account.activePrivateProjects) {
    addFinding(findings, {
      code: "PLAN_ENTITLEMENT_MISMATCH",
      severity: "high",
      message: `Active private projects ${account.activePrivateProjects} exceed lab plan limit ${plan.privateProjectLimit}.`,
      evidence: { plan, activePrivateProjects: account.activePrivateProjects },
    });
  }

  const duplicateTopups = findDuplicateTopups(topups);
  for (const duplicate of duplicateTopups) {
    addFinding(findings, {
      code: "TOPUP_DOUBLE_COUNTED",
      severity: "medium",
      topupId: duplicate.id,
      message: `Top-up ${duplicate.id} duplicates ${duplicate.duplicateOf}.`,
      evidence: duplicate,
    });
  }

  for (const invoice of invoices) {
    if ((invoice.discountPercent || 0) > (plan.maxDiscountPercent || 0) && !invoice.revenueOpsApprovalId) {
      addFinding(findings, {
        code: "DISCOUNT_EXCEEDS_POLICY",
        severity: "high",
        invoiceId: invoice.id,
        message: `Invoice ${invoice.id} applies ${invoice.discountPercent}% discount above policy ${plan.maxDiscountPercent}%.`,
        evidence: invoice,
      });
    }

    if (invoice.collectionMethod === "institutional_invoice" && !invoice.purchaseOrderId) {
      addFinding(findings, {
        code: "INSTITUTIONAL_PO_MISSING",
        severity: "high",
        invoiceId: invoice.id,
        message: `Institutional invoice ${invoice.id} is missing purchase order metadata.`,
        evidence: invoice,
      });
    }
  }

  for (const dataExport of licensingExports) {
    const privateFields = (dataExport.fields || []).filter((field) => /private|raw_content|email|patient/i.test(field));
    if (privateFields.length) {
      addFinding(findings, {
        code: "PRIVATE_CONTENT_LICENSED",
        severity: "critical",
        exportId: dataExport.id,
        message: `Analytics export ${dataExport.id} includes disallowed private fields: ${privateFields.join(", ")}.`,
        evidence: dataExport,
      });
    }
  }

  const providerTotals = providerRevenueTotals(account.paymentProviderBalances || []);
  if (providerTotals.spreadCents > 100) {
    addFinding(findings, {
      code: "PAYMENT_PROVIDER_DRIFT",
      severity: "medium",
      message: `Payment provider revenue totals differ by ${money(providerTotals.spreadCents)}.`,
      evidence: providerTotals,
    });
  }

  const riskScore = Math.min(100, findings.reduce((score, finding) => score + WEIGHTS[finding.severity], 0));
  const decision = riskScore >= 70 ? "hold-revenue-close" : riskScore >= 35 ? "repair-before-invoice-finalization" : "ready-for-billing";
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify(findings.map((finding) => [finding.code, finding.eventId, finding.invoiceId, finding.exportId]).sort()))
    .digest("hex")
    .slice(0, 16);

  return {
    account: {
      id: account.id,
      name: account.name,
      tier: plan.tier,
    },
    summary: {
      decision,
      riskScore,
      auditDigest,
      usageEventsReviewed: usageEvents.length,
      invoicesReviewed: invoices.length,
      licensingExportsReviewed: licensingExports.length,
      totalComputeUnits,
      effectiveComputeQuota,
      findings: findings.length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
    },
    findings,
    reconciliationGates: [
      { gate: "All billable usage appears on invoice previews.", passed: !findings.some((finding) => finding.code === "USAGE_NOT_BILLED") },
      { gate: "Compute usage cannot exceed quota without enforcement.", passed: !findings.some((finding) => finding.code === "OVER_QUOTA_NOT_BLOCKED") },
      { gate: "Institutional invoices include purchase order metadata.", passed: !findings.some((finding) => finding.code === "INSTITUTIONAL_PO_MISSING") },
      { gate: "Analytics licensing exports exclude private content.", passed: !findings.some((finding) => finding.code === "PRIVATE_CONTENT_LICENSED") },
      { gate: "Payment provider totals reconcile before close.", passed: !findings.some((finding) => finding.code === "PAYMENT_PROVIDER_DRIFT") },
    ],
  };
}

function dedupedTopups(topups) {
  const seen = new Set();
  return topups.filter((topup) => {
    const key = `${topup.provider}:${topup.externalPaymentId}:${topup.computeUnits}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findDuplicateTopups(topups) {
  const seen = new Map();
  const duplicates = [];
  for (const topup of topups) {
    const key = `${topup.provider}:${topup.externalPaymentId}:${topup.computeUnits}`;
    if (seen.has(key)) {
      duplicates.push({ ...topup, duplicateOf: seen.get(key) });
    } else {
      seen.set(key, topup.id);
    }
  }
  return duplicates;
}

function providerRevenueTotals(balances) {
  const totals = balances.map((balance) => ({
    provider: balance.provider,
    cents: cents(balance.recognizedRevenue),
  }));
  const values = totals.map((total) => total.cents);
  const max = values.length ? Math.max(...values) : 0;
  const min = values.length ? Math.min(...values) : 0;
  return { totals, spreadCents: max - min };
}

function renderMarkdownReport(report) {
  const lines = [
    `# Usage Meter Entitlement Audit: ${report.account.name}`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Risk score: ${report.summary.riskScore}`,
    `- Usage events reviewed: ${report.summary.usageEventsReviewed}`,
    `- Invoices reviewed: ${report.summary.invoicesReviewed}`,
    `- Licensing exports reviewed: ${report.summary.licensingExportsReviewed}`,
    `- Compute usage: ${report.summary.totalComputeUnits}/${report.summary.effectiveComputeQuota}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.code}`);
    lines.push(`  - ${finding.message}`);
    lines.push(`  - Recommendation: ${finding.recommendation}`);
  }

  lines.push("", "## Reconciliation Gates", "");
  for (const gate of report.reconciliationGates) {
    lines.push(`- [${gate.passed ? "x" : "!"}] ${gate.gate}`);
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  auditUsageMetering,
  renderMarkdownReport,
  findDuplicateTopups,
  providerRevenueTotals,
  money,
};
