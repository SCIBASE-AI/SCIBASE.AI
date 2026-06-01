const crypto = require("node:crypto");

const DAY_MS = 24 * 60 * 60 * 1000;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex");
}

function toDate(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(laterValue, earlierValue) {
  const later = toDate(laterValue);
  const earlier = toDate(earlierValue);
  if (!later || !earlier) {
    return null;
  }
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity] || 0;
}

function addFinding(findings, severity, code, message, refs, action, creditCents = 0) {
  findings.push({
    severity,
    code,
    message,
    refs: asArray(refs),
    action,
    creditCents
  });
}

function evaluateFreshnessPacket(packet) {
  const findings = [];
  const billingDate = packet.billingDate || new Date().toISOString().slice(0, 10);
  const contract = packet.contract || {};
  const product = packet.analyticsProduct || {};
  const snapshot = product.snapshot || {};
  const delivery = packet.deliveryEvidence || {};
  const requiredMetrics = asArray(contract.requiredMetrics);
  const deliveredMetrics = new Set(asArray(product.deliveredMetrics));
  const cadenceDays = Number(contract.refreshCadenceDays || 0);
  const graceDays = Number(contract.graceDays || 0);
  const monthlyFeeCents = Number(contract.monthlyFeeCents || 0);

  if (!cadenceDays || cadenceDays < 1) {
    addFinding(
      findings,
      "high",
      "CONTRACT_REFRESH_CADENCE_MISSING",
      "The analytics license lacks a usable contracted refresh cadence for billing readiness.",
      [contract.id || "contract"],
      "add_refresh_cadence_before_billing"
    );
  }

  const snapshotAgeDays = daysBetween(billingDate, snapshot.generatedAt);
  if (snapshotAgeDays === null) {
    addFinding(
      findings,
      "high",
      "SNAPSHOT_DATE_MISSING",
      "The analytics product snapshot is missing a generated-at date.",
      [snapshot.id || "snapshot"],
      "attach_snapshot_generation_evidence"
    );
  } else if (cadenceDays && snapshotAgeDays > cadenceDays + graceDays) {
    addFinding(
      findings,
      "high",
      "SNAPSHOT_STALE",
      `Snapshot age is ${snapshotAgeDays} days, beyond the ${cadenceDays} day cadence plus ${graceDays} day grace window.`,
      [snapshot.id || "snapshot"],
      "refresh_snapshot_before_invoice",
      Math.round(monthlyFeeCents * 0.25)
    );
  } else if (cadenceDays && snapshotAgeDays > cadenceDays) {
    addFinding(
      findings,
      "medium",
      "SNAPSHOT_IN_GRACE_WINDOW",
      `Snapshot age is ${snapshotAgeDays} days, inside grace but past the contracted ${cadenceDays} day cadence.`,
      [snapshot.id || "snapshot"],
      "apply_freshness_credit_or_refresh",
      Math.round(monthlyFeeCents * 0.1)
    );
  }

  const missingMetrics = requiredMetrics.filter((metric) => !deliveredMetrics.has(metric));
  if (missingMetrics.length > 0) {
    addFinding(
      findings,
      missingMetrics.length >= 2 ? "high" : "medium",
      "METRIC_COVERAGE_INCOMPLETE",
      `Missing ${missingMetrics.length} contracted analytics metrics: ${missingMetrics.join(", ")}.`,
      missingMetrics,
      "restore_metric_coverage_or_credit_invoice",
      Math.round(monthlyFeeCents * Math.min(0.35, missingMetrics.length * 0.12))
    );
  }

  const minimumCohortSize = Number(contract.minimumCohortSize || 0);
  for (const segment of asArray(product.segments)) {
    if (minimumCohortSize && segment.published === true && Number(segment.cohortSize || 0) < minimumCohortSize) {
      addFinding(
        findings,
        "critical",
        "ANONYMIZATION_THRESHOLD_BREACH",
        `${segment.id || "segment"} was published with cohort size ${segment.cohortSize}, below the contracted minimum ${minimumCohortSize}.`,
        [segment.id],
        "suppress_segment_and_hold_invoice"
      );
    }
  }

  for (const source of asArray(product.sourceProjects)) {
    if (source.withdrawnAt && source.includedInSnapshot === true) {
      addFinding(
        findings,
        "high",
        "SOURCE_PROJECT_WITHDRAWAL_UNRESOLVED",
        `${source.id || "source"} was withdrawn before billing but remains included in the analytics snapshot.`,
        [source.id],
        "remove_withdrawn_source_and_refresh_snapshot",
        Math.round(monthlyFeeCents * 0.2)
      );
    }
    if (source.embargoUntil && source.includedInSnapshot === true) {
      const embargoEndsAfterBilling = daysBetween(source.embargoUntil, billingDate);
      if (embargoEndsAfterBilling !== null && embargoEndsAfterBilling > 0) {
        addFinding(
          findings,
          "high",
          "SOURCE_EMBARGO_UNRESOLVED",
          `${source.id || "source"} remains embargoed for ${embargoEndsAfterBilling} more days but is included in the billed snapshot.`,
          [source.id],
          "exclude_embargoed_source_before_billing",
          Math.round(monthlyFeeCents * 0.2)
        );
      }
    }
  }

  const maxFeedAgeDays = Number(contract.maxReproducibilityFeedAgeDays || cadenceDays || 0);
  const scoreFeedAgeDays = daysBetween(billingDate, product.reproducibilityScoreFeedAt);
  if (maxFeedAgeDays && scoreFeedAgeDays === null) {
    addFinding(
      findings,
      "medium",
      "REPRODUCIBILITY_FEED_DATE_MISSING",
      "The analytics product lacks reproducibility-score feed freshness evidence.",
      [product.id || "analytics-product"],
      "attach_reproducibility_feed_evidence"
    );
  } else if (maxFeedAgeDays && scoreFeedAgeDays > maxFeedAgeDays) {
    addFinding(
      findings,
      "medium",
      "REPRODUCIBILITY_FEED_STALE",
      `Reproducibility score feed is ${scoreFeedAgeDays} days old, beyond the ${maxFeedAgeDays} day maximum.`,
      [product.id || "analytics-product"],
      "refresh_reproducibility_score_feed",
      Math.round(monthlyFeeCents * 0.1)
    );
  }

  const deliveryAgeDays = daysBetween(billingDate, delivery.deliveredAt);
  const hasDeliveryReceipt = Boolean(delivery.portalUploadId || delivery.exportDigest || delivery.dashboardSnapshotHash);
  if (!delivery.deliveredAt || !hasDeliveryReceipt) {
    addFinding(
      findings,
      "high",
      "DELIVERY_EVIDENCE_MISSING",
      "Customer-facing delivery evidence is incomplete for the licensed analytics product.",
      [delivery.id || "delivery"],
      "attach_delivery_evidence_before_invoice"
    );
  } else if (cadenceDays && deliveryAgeDays !== null && deliveryAgeDays > cadenceDays + graceDays) {
    addFinding(
      findings,
      "medium",
      "DELIVERY_EVIDENCE_STALE",
      `Customer delivery evidence is ${deliveryAgeDays} days old for a ${cadenceDays} day product cadence.`,
      [delivery.id || "delivery"],
      "refresh_customer_delivery_evidence",
      Math.round(monthlyFeeCents * 0.1)
    );
  }

  findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.code.localeCompare(b.code));
  const highestSeverity = findings.reduce((max, finding) => Math.max(max, severityRank(finding.severity)), 0);
  const creditCents = findings.reduce((sum, finding) => sum + Number(finding.creditCents || 0), 0);
  const cappedCreditCents = Math.min(monthlyFeeCents, creditCents);
  const provisionalNetInvoiceCents = Math.max(0, monthlyFeeCents - cappedCreditCents);
  const decision = highestSeverity >= 3
    ? "hold_analytics_invoice"
    : cappedCreditCents > 0
      ? "invoice_with_freshness_credit"
      : "release_analytics_invoice";
  const netInvoiceCents = decision === "hold_analytics_invoice" ? 0 : provisionalNetInvoiceCents;

  const coverage = {
    requiredMetrics,
    deliveredMetrics: Array.from(deliveredMetrics),
    missingMetrics,
    snapshotAgeDays,
    cadenceDays,
    graceDays,
    scoreFeedAgeDays,
    deliveryAgeDays,
    segmentsReviewed: asArray(product.segments).length,
    sourceProjectsReviewed: asArray(product.sourceProjects).length
  };
  const summary = {
    customerId: packet.customerId,
    contractId: contract.id,
    productId: product.id,
    billingDate,
    decision,
    findingCount: findings.length,
    highOrCriticalFindings: findings.filter((finding) => severityRank(finding.severity) >= 3).length,
    monthlyFeeCents,
    recommendedCreditCents: cappedCreditCents,
    provisionalNetInvoiceCents,
    netInvoiceCents
  };
  const auditDigest = `sha256:${sha256({ summary, findings, coverage }).slice(0, 16)}`;

  return {
    summary: {
      ...summary,
      auditDigest
    },
    coverage,
    findings,
    financeActions: buildFinanceActions(decision, findings, cappedCreditCents)
  };
}

function buildFinanceActions(decision, findings, creditCents) {
  const actions = [];
  if (decision === "hold_analytics_invoice") {
    actions.push({
      id: "hold_invoice_release",
      reason: "high_or_critical_freshness_blocker"
    });
  } else if (decision === "invoice_with_freshness_credit") {
    actions.push({
      id: "apply_freshness_credit",
      creditCents
    });
  } else {
    actions.push({
      id: "release_invoice",
      reason: "freshness_and_delivery_evidence_clean"
    });
  }

  const seen = new Set(actions.map((action) => action.id));
  for (const finding of findings) {
    if (!finding.action || seen.has(finding.action)) {
      continue;
    }
    seen.add(finding.action);
    actions.push({
      id: finding.action,
      severity: finding.severity,
      refs: finding.refs
    });
  }
  return actions;
}

function renderMarkdownReport(packet, evaluation) {
  const lines = [];
  lines.push(`# Analytics Data Product Freshness Review: ${packet.customerId}`);
  lines.push("");
  lines.push(`Decision: **${evaluation.summary.decision}**`);
  lines.push(`Audit digest: \`${evaluation.summary.auditDigest}\``);
  lines.push(`Monthly fee: ${formatMoney(evaluation.summary.monthlyFeeCents)}`);
  lines.push(`Recommended credit: ${formatMoney(evaluation.summary.recommendedCreditCents)}`);
  lines.push(`Net invoice: ${formatMoney(evaluation.summary.netInvoiceCents)}`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (evaluation.findings.length === 0) {
    lines.push("No data-product freshness blockers were detected.");
  } else {
    lines.push("| Severity | Code | Message | Action | Credit |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const finding of evaluation.findings) {
      lines.push(`| ${finding.severity} | \`${finding.code}\` | ${escapeMarkdown(finding.message)} | \`${finding.action}\` | ${formatMoney(finding.creditCents || 0)} |`);
    }
  }
  lines.push("");
  lines.push("## Coverage");
  lines.push("");
  lines.push(`- Required metrics: ${evaluation.coverage.requiredMetrics.join(", ") || "none"}`);
  lines.push(`- Delivered metrics: ${evaluation.coverage.deliveredMetrics.join(", ") || "none"}`);
  lines.push(`- Missing metrics: ${evaluation.coverage.missingMetrics.join(", ") || "none"}`);
  lines.push(`- Snapshot age days: ${evaluation.coverage.snapshotAgeDays ?? "unknown"}`);
  lines.push(`- Reproducibility feed age days: ${evaluation.coverage.scoreFeedAgeDays ?? "unknown"}`);
  lines.push(`- Delivery evidence age days: ${evaluation.coverage.deliveryAgeDays ?? "unknown"}`);
  lines.push("");
  lines.push("Synthetic data only. No private research data, customer portals, billing systems, payment processors, credentials, payout systems, or external APIs are used.");
  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(evaluation) {
  const color = evaluation.summary.decision === "hold_analytics_invoice"
    ? "#b91c1c"
    : evaluation.summary.decision === "invoice_with_freshness_credit"
      ? "#b45309"
      : "#047857";
  const rows = evaluation.findings.slice(0, 5).map((finding, index) => {
    const y = 318 + index * 42;
    return `<text x="76" y="${y}" font-family="Arial, sans-serif" font-size="22" fill="#111827">${escapeXml(finding.severity.toUpperCase())} ${escapeXml(finding.code)}</text>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="Analytics data product freshness guard summary">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
  <text x="76" y="110" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#111827">Analytics Data Product Freshness Guard</text>
  <rect x="76" y="140" width="640" height="58" rx="10" fill="${color}"/>
  <text x="102" y="178" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(evaluation.summary.decision)}</text>
  <text x="76" y="242" font-family="Arial, sans-serif" font-size="24" fill="#374151">Findings: ${evaluation.summary.findingCount}</text>
  <text x="76" y="276" font-family="Arial, sans-serif" font-size="24" fill="#374151">Net invoice: ${formatMoney(evaluation.summary.netInvoiceCents)} after ${formatMoney(evaluation.summary.recommendedCreditCents)} credit</text>
${rows || '<text x="76" y="318" font-family="Arial, sans-serif" font-size="22" fill="#047857">No findings detected.</text>'}
  <text x="76" y="642" font-family="Arial, sans-serif" font-size="20" fill="#6b7280">${escapeXml(evaluation.summary.auditDigest)}</text>
</svg>
`;
}

function formatMoney(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  evaluateFreshnessPacket,
  renderMarkdownReport,
  renderSvgSummary,
  sha256
};
