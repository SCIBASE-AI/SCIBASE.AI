const REQUIRED_APPROVALS = ["sales", "finance", "sponsor"];
const NON_STANDARD_APPROVALS = ["legal", "finance"];

function addIssue(issues, severity, code, message, context) {
  issues.push({ severity, code, message, context });
}

function approvalRoles(quote) {
  return new Set((quote.approvals || []).map((approval) => approval.role));
}

function lineNet(line) {
  const gross =
    line.kind === "subscription" || line.kind === "license"
      ? (line.seats || 0) * (line.unitPrice || 0) * (line.months || 1)
      : (line.units || 0) * (line.unitPrice || 0);
  return Math.round(gross * (1 - (line.discountPct || 0) / 100));
}

function quoteTotal(quote) {
  return (quote.lines || []).reduce((sum, line) => sum + lineNet(line), 0);
}

function checkCustomerEvidence(quote, issues, actions) {
  if (quote.status !== "approved") {
    addIssue(issues, "critical", "quote-not-approved", "Quote is not in an approved state.", quote.status);
    actions.push("Hold entitlement activation until quote status is approved.");
  }

  if (!quote.legalEntity) {
    addIssue(issues, "critical", "missing-legal-entity", "Legal billing entity is missing.", quote.customer);
    actions.push("Collect legal entity before invoice creation.");
  }

  if (!quote.billingContact) {
    addIssue(issues, "high", "missing-billing-contact", "Billing contact is missing.", quote.customer);
    actions.push("Collect accounts-payable contact before quote acceptance.");
  }

  if (quote.payment.route === "institutional-invoice" && !quote.payment.purchaseOrder) {
    addIssue(issues, "high", "missing-purchase-order", "Institutional invoice route lacks purchase-order evidence.", quote.customer);
    actions.push("Hold institutional invoice until PO evidence is attached.");
  }
}

function checkApprovals(quote, issues, actions) {
  const roles = approvalRoles(quote);
  for (const role of REQUIRED_APPROVALS) {
    if (!roles.has(role)) {
      addIssue(issues, "critical", "missing-required-approval", `Missing required ${role} approval.`, role);
      actions.push(`Collect ${role} approval before invoice or entitlement activation.`);
    }
  }

  if ((quote.nonStandardTerms || []).length > 0) {
    for (const role of NON_STANDARD_APPROVALS) {
      if (!roles.has(role)) {
        addIssue(issues, "critical", "missing-nonstandard-approval", `Non-standard terms require ${role} approval.`, role);
        actions.push(`Route non-standard term packet to ${role}.`);
      }
    }
  }
}

function checkPricing(quote, issues, actions) {
  for (const line of quote.lines || []) {
    if ((line.discountPct || 0) > (line.approvedDiscountPct || 0)) {
      addIssue(issues, "critical", "discount-exceeds-approval", "Discount exceeds approved threshold.", line.sku);
      actions.push(`Reduce ${line.sku} discount or collect discount exception approval.`);
    }

    if (line.kind === "compute" && line.marginFloorPct >= 40 && line.unitPrice < 0.08) {
      addIssue(issues, "high", "compute-margin-floor-risk", "AI compute unit price appears below margin floor.", line.sku);
      actions.push(`Reprice ${line.sku} or attach finance-approved margin exception.`);
    }

    if (line.kind === "license" && !line.privacyAddendum) {
      addIssue(issues, "critical", "missing-license-privacy-addendum", "Analytics license lacks privacy or data-use addendum.", line.sku);
      actions.push("Attach privacy/data-use addendum before analytics license activation.");
    }
  }
}

function checkInvoiceAndEntitlements(quote, issues, actions) {
  const expectedTotal = quoteTotal(quote);
  if (expectedTotal !== quote.invoice.total) {
    addIssue(issues, "critical", "invoice-total-drift", "Invoice total does not match approved quote lines.", `${expectedTotal} vs ${quote.invoice.total}`);
    actions.push("Regenerate invoice from approved quote line items.");
  }

  if (quote.invoice.currency !== quote.payment.currency) {
    addIssue(issues, "high", "invoice-currency-drift", "Invoice currency differs from payment route currency.", quote.invoice.currency);
    actions.push("Confirm currency and FX treatment before issuing invoice.");
  }

  const quoteSkus = new Set((quote.lines || []).map((line) => line.sku));
  for (const sku of quote.invoice.lineSkus || []) {
    if (!quoteSkus.has(sku)) {
      addIssue(issues, "critical", "unquoted-invoice-line", "Invoice contains a SKU not present on the approved quote.", sku);
      actions.push(`Remove unquoted invoice line ${sku} or reapprove quote.`);
    }
  }

  const quotedSubscriptionSeats = (quote.lines || [])
    .filter((line) => line.kind === "subscription")
    .reduce((sum, line) => sum + (line.seats || 0), 0);
  const quotedAnalyticsSeats = (quote.lines || [])
    .filter((line) => line.kind === "license")
    .reduce((sum, line) => sum + (line.seats || 0), 0);
  const quotedComputeUnits = (quote.lines || [])
    .filter((line) => line.kind === "compute")
    .reduce((sum, line) => sum + (line.units || 0), 0);

  if (quote.entitlements.seats > quotedSubscriptionSeats) {
    addIssue(issues, "critical", "seat-entitlement-overage", "Seat entitlement exceeds signed quote scope.", quote.id);
    actions.push("Reduce seat entitlement to approved quote scope.");
  }

  if (quote.entitlements.analyticsSeats > quotedAnalyticsSeats) {
    addIssue(issues, "critical", "analytics-entitlement-overage", "Analytics seat entitlement exceeds signed quote scope.", quote.id);
    actions.push("Hold analytics activation until quote is amended.");
  }

  if (quote.entitlements.computeUnits > quotedComputeUnits) {
    addIssue(issues, "critical", "compute-entitlement-overage", "Compute entitlement exceeds signed quote scope.", quote.id);
    actions.push("Hold compute pack activation until quote is amended.");
  }

  if (quote.entitlements.startsAt !== quote.term.startsAt || quote.entitlements.endsAt !== quote.term.endsAt) {
    addIssue(issues, "high", "entitlement-term-drift", "Entitlement dates differ from quote contract dates.", quote.id);
    actions.push("Align entitlement dates to signed order form dates.");
  }
}

function scoreFromIssues(issues) {
  const weights = { critical: 32, high: 14, medium: 7, low: 2 };
  const deduction = issues.reduce((sum, issue) => sum + (weights[issue.severity] || 4), 0);
  return Math.max(0, 100 - deduction);
}

function decisionFromIssues(issues) {
  const critical = issues.filter((issue) => issue.severity === "critical").length;
  const high = issues.filter((issue) => issue.severity === "high").length;
  if (critical > 0) return "hold-quote";
  if (high > 0) return "finance-review";
  return "approve-activation";
}

function reviewQuote(quote) {
  const issues = [];
  const actions = [];

  checkCustomerEvidence(quote, issues, actions);
  checkApprovals(quote, issues, actions);
  checkPricing(quote, issues, actions);
  checkInvoiceAndEntitlements(quote, issues, actions);

  if (actions.length === 0) {
    actions.push("Activate invoice, subscription entitlements, compute credits, and analytics license from approved quote.");
  }

  return {
    quoteId: quote.id,
    customer: quote.customer,
    decision: decisionFromIssues(issues),
    quoteScore: scoreFromIssues(issues),
    expectedQuoteTotal: quoteTotal(quote),
    invoiceTotal: quote.invoice.total,
    issueCounts: issues.reduce((counts, issue) => {
      counts[issue.severity] = (counts[issue.severity] || 0) + 1;
      return counts;
    }, {}),
    issues,
    actions: Array.from(new Set(actions)),
  };
}

function reviewQuotes(quotes) {
  const results = quotes.map(reviewQuote);
  const summary = {
    quoteCount: results.length,
    approvedForActivation: results.filter((result) => result.decision === "approve-activation").length,
    financeReview: results.filter((result) => result.decision === "finance-review").length,
    held: results.filter((result) => result.decision === "hold-quote").length,
    averageQuoteScore: Math.round(results.reduce((sum, result) => sum + result.quoteScore, 0) / results.length),
  };

  return {
    generatedAt: new Date("2026-05-28T00:00:00Z").toISOString(),
    requirementMap: [
      "Tiered subscription billing: validates seats, discounts, annual terms, and institutional order form evidence.",
      "AI compute billing: holds below-margin or unapproved compute packs before entitlement activation.",
      "Licensing APIs and analytics: requires privacy/data-use addenda before analytics license activation.",
      "Secure payment integrations and invoicing: reconciles quote totals, invoice lines, PO evidence, and payment currency.",
    ],
    summary,
    results,
  };
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Revenue Quote Approval Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Quotes reviewed: ${report.summary.quoteCount}`,
    `- Approved for activation: ${report.summary.approvedForActivation}`,
    `- Finance review: ${report.summary.financeReview}`,
    `- Held: ${report.summary.held}`,
    `- Average quote score: ${report.summary.averageQuoteScore}`,
    "",
    "## Requirement Map",
    "",
    ...report.requirementMap.map((item) => `- ${item}`),
    "",
    "## Quote Decisions",
    "",
  ];

  for (const result of report.results) {
    lines.push(`### ${result.quoteId}`);
    lines.push("");
    lines.push(`- Customer: ${result.customer}`);
    lines.push(`- Decision: ${result.decision}`);
    lines.push(`- Quote score: ${result.quoteScore}`);
    lines.push(`- Expected quote total: ${result.expectedQuoteTotal}`);
    lines.push(`- Invoice total: ${result.invoiceTotal}`);
    lines.push(`- Issues: ${result.issues.length}`);
    for (const action of result.actions) {
      lines.push(`- Action: ${action}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function renderSvgReport(report) {
  const width = 1120;
  const rowHeight = 88;
  const height = 150 + report.results.length * rowHeight;
  const rows = report.results
    .map((result, index) => {
      const y = 112 + index * rowHeight;
      const color =
        result.decision === "approve-activation"
          ? "#2f9e44"
          : result.decision === "finance-review"
            ? "#f08c00"
            : "#d6336c";
      const barWidth = Math.max(24, Math.round(result.quoteScore * 5.2));
      return `
  <g transform="translate(40 ${y})">
    <text x="0" y="0" class="title">${escapeHtml(result.quoteId)}</text>
    <text x="0" y="25" class="meta">Decision: ${escapeHtml(result.decision)} | Issues: ${result.issues.length}</text>
    <rect x="430" y="-18" width="540" height="22" rx="4" fill="#e9ecef"/>
    <rect x="430" y="-18" width="${barWidth}" height="22" rx="4" fill="${color}"/>
    <text x="990" y="0" class="score">${result.quoteScore}</text>
  </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .page { fill: #f8f9fa; }
    .heading { font: 700 34px Arial, sans-serif; fill: #17202a; }
    .sub { font: 16px Arial, sans-serif; fill: #495057; }
    .title { font: 700 18px Arial, sans-serif; fill: #212529; }
    .meta { font: 14px Arial, sans-serif; fill: #495057; }
    .score { font: 700 18px Arial, sans-serif; fill: #212529; text-anchor: end; }
  </style>
  <rect class="page" width="${width}" height="${height}"/>
  <text x="40" y="54" class="heading">Revenue Quote Approval Guard</text>
  <text x="40" y="84" class="sub">Reconciles order forms, approvals, invoices, and entitlements before activation.</text>
${rows}
</svg>
`;
}

module.exports = {
  reviewQuote,
  reviewQuotes,
  renderMarkdownReport,
  renderSvgReport,
  quoteTotal,
};
