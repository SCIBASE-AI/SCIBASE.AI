const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 34,
  high: 18,
  medium: 8,
  low: 3,
};

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function finding(severity, code, title, evidence, action) {
  return { severity, code, title, evidence, action };
}

function dollarsToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function centsToDollars(cents) {
  return Number((cents / 100).toFixed(2));
}

function formatMoney(cents) {
  return `$${centsToDollars(cents).toFixed(2)}`;
}

function lineItem(code, description, quantity, unitCents, metadata = {}) {
  const safeQuantity = Math.max(0, Number(quantity || 0));
  const safeUnitCents = Math.round(Number(unitCents || 0));
  return {
    code,
    description,
    quantity: safeQuantity,
    unitCents: safeUnitCents,
    totalCents: Math.round(safeQuantity * safeUnitCents),
    metadata,
  };
}

function planFromCatalog(account, catalog) {
  const plan = catalog.plans[account.planId];
  if (!plan) {
    throw new Error(`Unknown plan: ${account.planId}`);
  }
  return plan;
}

function buildSubscriptionLine(account, plan) {
  const cycle = account.billingCycle || "monthly";
  const unitCents = cycle === "annual" ? plan.annualCents : plan.monthlyCents;
  return lineItem(
    `subscription:${plan.id}:${cycle}`,
    `${plan.name} ${cycle} subscription`,
    1,
    unitCents,
    { planId: plan.id, billingCycle: cycle },
  );
}

function buildUsageLines(account, plan, catalog) {
  const usage = account.usage || {};
  const lines = [];
  const included = plan.included || {};
  const rates = catalog.usageRates;

  const billableAiTokens = Math.max(0, (usage.aiTokens || 0) - (included.aiTokens || 0));
  if (billableAiTokens > 0) {
    lines.push(lineItem(
      "usage:ai-tokens",
      "AI token overage",
      Math.ceil(billableAiTokens / 1000),
      rates.aiTokenPerThousandCents,
      { included: included.aiTokens || 0, measured: usage.aiTokens || 0 },
    ));
  }

  const billableComputeHours = Math.max(0, (usage.computeHours || 0) - (included.computeHours || 0));
  if (billableComputeHours > 0) {
    lines.push(lineItem(
      "usage:compute-hours",
      "AI compute hour overage",
      billableComputeHours,
      rates.computeHourCents,
      { included: included.computeHours || 0, measured: usage.computeHours || 0 },
    ));
  }

  const billableStorageGb = Math.max(0, (usage.storageGb || 0) - (included.storageGb || 0));
  if (billableStorageGb > 0) {
    lines.push(lineItem(
      "usage:storage-gb",
      "Private research storage overage",
      billableStorageGb,
      rates.storageGbCents,
      { included: included.storageGb || 0, measured: usage.storageGb || 0 },
    ));
  }

  const billableApiCalls = Math.max(0, (usage.apiCalls || 0) - (included.apiCalls || 0));
  if (billableApiCalls > 0) {
    lines.push(lineItem(
      "usage:api-calls",
      "Licensing API call overage",
      Math.ceil(billableApiCalls / 1000),
      rates.apiCallPerThousandCents,
      { included: included.apiCalls || 0, measured: usage.apiCalls || 0 },
    ));
  }

  return lines;
}

function buildSeatLine(account, plan) {
  const includedSeats = plan.included.seats || 1;
  const billableSeats = Math.max(0, (account.seats || 1) - includedSeats);
  if (billableSeats === 0) {
    return null;
  }
  return lineItem(
    "subscription:extra-seats",
    "Additional lab or institution seats",
    billableSeats,
    plan.extraSeatCents || 0,
    { includedSeats, requestedSeats: account.seats },
  );
}

function buildLicensingLines(account, catalog) {
  const licensing = account.licensing || {};
  if (!licensing.enabled) {
    return [];
  }

  const lines = [
    lineItem(
      "licensing:analytics-access",
      "Anonymized analytics licensing access",
      1,
      catalog.licensing.analyticsAccessCents,
      { exportMode: licensing.exportMode },
    ),
  ];

  if (licensing.apiPackage) {
    lines.push(lineItem(
      "licensing:api-package",
      "Structured metadata API package",
      1,
      catalog.licensing.apiPackageCents,
      { package: licensing.apiPackage },
    ));
  }

  return lines;
}

function buildDiscountLines(account, subtotalCents) {
  const discounts = account.discounts || [];
  return discounts.map((discount) => {
    if (discount.percentOff) {
      const discountCents = -Math.round(subtotalCents * discount.percentOff);
      return lineItem(
        `discount:${discount.code}`,
        `${discount.code} discount`,
        1,
        discountCents,
        { percentOff: discount.percentOff },
      );
    }
    return lineItem(
      `discount:${discount.code}`,
      `${discount.code} credit`,
      1,
      -dollarsToCents(discount.amountUsd || 0),
      { amountUsd: discount.amountUsd || 0 },
    );
  });
}

function reviewBillingProfile(account, plan, totalCents, context) {
  const findings = [];
  const profile = account.billingProfile || {};
  const provider = account.paymentProvider || {};

  if (!provider.customerId && !profile.invoiceEmail) {
    findings.push(finding(
      "blocker",
      "NO_COLLECTABLE_PAYMENT_PATH",
      "No collectable payment path is configured",
      `${account.id} has no payment provider customer and no invoice email.`,
      "Collect a Stripe customer, verified payment method, or institutional invoice contact before handoff.",
    ));
  }

  if (provider.customerId && !provider.defaultPaymentMethod && !profile.purchaseOrder) {
    findings.push(finding(
      "high",
      "PAYMENT_METHOD_OR_PO_MISSING",
      "Payment customer lacks a default payment method or purchase order",
      `${account.id} has customer ${provider.customerId} without a default payment method or PO.`,
      "Ask billing ops to attach a default payment method or validated purchase order before collection.",
    ));
  }

  if (!profile.country || (context.taxRequiredCountries || []).includes(profile.country) && !profile.taxId) {
    findings.push(finding(
      "high",
      "TAX_PROFILE_INCOMPLETE",
      "Billing tax profile is incomplete",
      `${account.id} country=${profile.country || "missing"} taxId=${profile.taxId ? "present" : "missing"}.`,
      "Hold the invoice until country and tax ID requirements are complete.",
    ));
  }

  if (plan.requiresContract && !account.contract?.signedAt) {
    findings.push(finding(
      "blocker",
      "ENTERPRISE_CONTRACT_UNSIGNED",
      "Enterprise plan requires a signed contract",
      `${account.id} is on ${plan.id} without a signed contract date.`,
      "Route to sales/legal and block automatic payment-provider handoff.",
    ));
  }

  if (account.budgetCapCents && totalCents > account.budgetCapCents) {
    findings.push(finding(
      "blocker",
      "BUDGET_CAP_EXCEEDED",
      "Invoice total exceeds the approved budget cap",
      `${formatMoney(totalCents)} exceeds approved cap ${formatMoney(account.budgetCapCents)}.`,
      "Require budget owner approval or reduce billable usage before collection.",
    ));
  }

  return findings;
}

function reviewUsage(account, plan, context) {
  const findings = [];
  const usage = account.usage || {};
  const previous = account.previousUsage || {};
  const included = plan.included || {};

  ["aiTokens", "computeHours", "storageGb", "apiCalls"].forEach((metric) => {
    const value = usage[metric] || 0;
    const baseline = previous[metric] || 0;
    if (baseline > 0 && value > baseline * (context.usageSpikeMultiplier || 3)) {
      findings.push(finding(
        "medium",
        "USAGE_SPIKE_REVIEW",
        "Usage spike should be reviewed before invoicing",
        `${metric} rose from ${baseline} to ${value}.`,
        "Review audit logs or usage annotations before sending the invoice.",
      ));
    }
  });

  if ((usage.computeHours || 0) > (included.computeHours || 0) && !account.usageAttestation?.computeApproved) {
    findings.push(finding(
      "high",
      "COMPUTE_OVERAGE_UNATTESTED",
      "Compute overage lacks reviewer attestation",
      `${account.id} used ${usage.computeHours || 0} compute hours against ${included.computeHours || 0} included.`,
      "Ask the project owner to attest that the compute jobs were authorized.",
    ));
  }

  return findings;
}

function reviewLicensing(account) {
  const findings = [];
  const licensing = account.licensing || {};
  if (!licensing.enabled) {
    return findings;
  }

  if (licensing.exportMode !== "aggregate-anonymized") {
    findings.push(finding(
      "blocker",
      "LICENSING_EXPORT_NOT_ANONYMIZED",
      "Licensing export is not aggregate-anonymized",
      `${account.id} requested ${licensing.exportMode || "unknown"} export mode.`,
      "Allow only aggregate-anonymized metadata exports for licensing revenue.",
    ));
  }

  if (licensing.includesPrivateContent) {
    findings.push(finding(
      "blocker",
      "PRIVATE_CONTENT_IN_LICENSING_EXPORT",
      "Private research content cannot be included in licensing exports",
      `${account.id} licensing packet includes private content.`,
      "Remove private project content and regenerate the export manifest before billing.",
    ));
  }

  if (!licensing.dataProcessingAgreementId) {
    findings.push(finding(
      "high",
      "DPA_MISSING_FOR_LICENSING",
      "Data licensing requires a data-processing agreement",
      `${account.id} has analytics licensing enabled without a DPA reference.`,
      "Collect the institutional DPA before allowing analytics licensing billing.",
    ));
  }

  return findings;
}

function buildInvoicePreview(account, catalog, context = {}) {
  const plan = planFromCatalog(account, catalog);
  const subscriptionLine = buildSubscriptionLine(account, plan);
  const seatLine = buildSeatLine(account, plan);
  const usageLines = buildUsageLines(account, plan, catalog);
  const licensingLines = buildLicensingLines(account, catalog);
  const subtotalLines = [subscriptionLine, seatLine, ...usageLines, ...licensingLines].filter(Boolean);
  const subtotalCents = subtotalLines.reduce((sum, item) => sum + item.totalCents, 0);
  const discountLines = buildDiscountLines(account, subtotalCents);
  const lines = [...subtotalLines, ...discountLines];
  const totalCents = Math.max(0, lines.reduce((sum, item) => sum + item.totalCents, 0));

  const findings = [
    ...reviewBillingProfile(account, plan, totalCents, context),
    ...reviewUsage(account, plan, context),
    ...reviewLicensing(account),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "block-payment-provider-handoff"
    : high
      ? "manual-revenue-review"
      : findings.length
        ? "ready-with-billing-notices"
        : "ready-for-payment-provider";

  const packet = {
    accountId: account.id,
    organizationName: account.organizationName,
    reviewedAt: context.reviewDate,
    plan: {
      id: plan.id,
      name: plan.name,
      billingCycle: account.billingCycle || "monthly",
    },
    providerMode: account.paymentProvider?.mode || "invoice-preview-only",
    decision,
    riskScore,
    subtotalCents,
    totalCents,
    totalUsd: centsToDollars(totalCents),
    currency: catalog.currency || "USD",
    lines,
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-billing-data-only",
  };

  return {
    ...packet,
    invoiceDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Billing Readiness Guard",
    "",
    `Account: ${result.organizationName} (${result.accountId})`,
    `Decision: ${result.decision}`,
    `Total: ${formatMoney(result.totalCents)} ${result.currency}`,
    `Risk score: ${result.riskScore}`,
    `Invoice digest: ${result.invoiceDigest}`,
    "",
    "## Invoice Lines",
  ];

  result.lines.forEach((item) => {
    lines.push(`- ${item.code}: ${item.quantity} x ${formatMoney(item.unitCents)} = ${formatMoney(item.totalCents)}`);
  });

  lines.push("", "## Findings");
  if (!result.findings.length) {
    lines.push("- No billing-readiness issues detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }

  lines.push("", "## Safety", "- Synthetic billing packet only; no Stripe, PayPal, bank, customer, tax, contract, private content, or external API calls.");
  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const color = result.decision === "block-payment-provider-handoff"
    ? "#b42318"
    : result.decision === "ready-for-payment-provider"
      ? "#067647"
      : "#b54708";
  const maxLine = Math.max(...result.lines.map((item) => Math.abs(item.totalCents)), 1);
  const rows = result.lines.slice(0, 6).map((item, index) => {
    const y = 190 + index * 38;
    const width = Math.round(370 * Math.abs(item.totalCents) / maxLine);
    const fill = item.totalCents < 0 ? "#1570ef" : "#12b76a";
    return `<text x="36" y="${y}" font-family="Arial" font-size="16" fill="#344054">${escapeXml(item.code)}</text>
  <rect x="330" y="${y - 18}" width="370" height="20" rx="4" fill="#eaecf0"/>
  <rect x="330" y="${y - 18}" width="${width}" height="20" rx="4" fill="${fill}"/>
  <text x="720" y="${y}" font-family="Arial" font-size="16" fill="#344054">${escapeXml(formatMoney(item.totalCents))}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="460" viewBox="0 0 960 460" role="img" aria-label="Billing readiness guard summary">
  <rect width="960" height="460" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="412" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Billing Readiness Guard</text>
  <rect x="36" y="98" width="420" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="486" y="129" font-family="Arial" font-size="22" fill="#101828">Total: ${escapeXml(formatMoney(result.totalCents))}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Invoice digest: ${escapeXml(result.invoiceDigest)}</text>
  ${rows}
  <text x="36" y="418" font-family="Arial" font-size="18" fill="#667085">Synthetic billing data only. No payment-provider calls.</text>
</svg>
`;
}

module.exports = {
  buildInvoicePreview,
  centsToDollars,
  digest,
  formatMoney,
  lineItem,
  renderMarkdownReport,
  renderSvgSummary,
};
