const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 30,
  high: 18,
  medium: 9,
  low: 4,
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

function requiredSampleSize(effectSize, targetPower, alpha) {
  if (!effectSize || effectSize <= 0) {
    return Infinity;
  }
  const powerFactor = Math.max(0.75, targetPower || 0.8) / 0.8;
  const alphaFactor = 0.05 / Math.max(0.001, alpha || 0.05);
  return Math.ceil((16 / (effectSize * effectSize)) * powerFactor * Math.sqrt(alphaFactor));
}

function effectiveSampleSize(endpoint) {
  const enrolled = endpoint.enrolledN || 0;
  const attrition = endpoint.attritionRate || 0;
  const excluded = endpoint.excludedN || 0;
  return Math.max(0, Math.floor(enrolled * (1 - attrition) - excluded));
}

function reviewEndpoint(endpoint, context) {
  const findings = [];
  const minPower = context.minimumPower || 0.8;
  const alpha = endpoint.alpha || context.defaultAlpha || 0.05;
  const requiredN = endpoint.requiredN || requiredSampleSize(endpoint.effectSize, minPower, alpha);
  const effectiveN = effectiveSampleSize(endpoint);

  if (!endpoint.sampleSizeJustification) {
    findings.push(finding(
      endpoint.role === "primary" ? "high" : "medium",
      "MISSING_SAMPLE_SIZE_JUSTIFICATION",
      "Endpoint lacks a sample-size justification",
      `${endpoint.id} reports n=${endpoint.enrolledN} without a prospective sample-size rationale.`,
      "Ask authors to add a prospective sample-size calculation or downgrade the AI summary confidence.",
    ));
  }

  if (endpoint.plannedPower && endpoint.plannedPower < minPower) {
    findings.push(finding(
      "high",
      "PLANNED_POWER_BELOW_THRESHOLD",
      "Planned power is below the review threshold",
      `${endpoint.id} planned power is ${endpoint.plannedPower}, below required ${minPower}.`,
      "Hold strong efficacy or reproducibility claims until the manuscript explains the lower power target.",
    ));
  }

  if (effectiveN < requiredN) {
    findings.push(finding(
      endpoint.role === "primary" ? "blocker" : "high",
      "EFFECTIVE_N_BELOW_REQUIRED",
      "Effective sample size is below the required level",
      `${endpoint.id} effective n=${effectiveN} after attrition/exclusions, below required n=${requiredN}.`,
      "Flag the endpoint as underpowered and require either more data, narrower claims, or an exploratory label.",
    ));
  }

  if (endpoint.attritionRate >= 0.15 && !endpoint.attritionSensitivity) {
    findings.push(finding(
      "medium",
      "ATTRITION_SENSITIVITY_MISSING",
      "Attrition risk is not reflected in a sensitivity analysis",
      `${endpoint.id} attrition is ${Math.round(endpoint.attritionRate * 100)}% without a sensitivity check.`,
      "Request an attrition-adjusted sensitivity analysis before AI summaries treat the result as stable.",
    ));
  }

  if (endpoint.effectSizeSource && endpoint.effectSizeSource.domain !== endpoint.domain) {
    findings.push(finding(
      "medium",
      "EFFECT_SIZE_SOURCE_MISMATCH",
      "Effect-size source does not match the manuscript domain",
      `${endpoint.id} uses effect-size evidence from ${endpoint.effectSizeSource.domain} for ${endpoint.domain}.`,
      "Ask reviewers to verify transferability or replace the effect-size prior with domain-matched evidence.",
    ));
  }

  if (endpoint.role === "secondary" && endpoint.usedInHeadline) {
    findings.push(finding(
      "medium",
      "SECONDARY_ENDPOINT_HEADLINE_CLAIM",
      "Headline claim relies on a secondary endpoint",
      `${endpoint.id} is secondary but appears in the manuscript headline claim.`,
      "Keep the claim visible only as exploratory unless authors realign the endpoint hierarchy.",
    ));
  }

  return {
    endpointId: endpoint.id,
    role: endpoint.role,
    enrolledN: endpoint.enrolledN,
    effectiveN,
    requiredN: Number.isFinite(requiredN) ? requiredN : null,
    plannedPower: endpoint.plannedPower || null,
    findings,
  };
}

function reviewSubgroups(manuscript, context) {
  const findings = [];
  const minSubgroupN = context.minimumSubgroupN || 30;
  const minEvents = context.minimumEventsPerModel || 10;

  (manuscript.subgroupClaims || []).forEach((claim) => {
    if (claim.n < minSubgroupN) {
      findings.push(finding(
        "high",
        "SUBGROUP_N_TOO_SMALL",
        "Subgroup claim is based on too few observations",
        `${claim.id} uses subgroup n=${claim.n}, below minimum n=${minSubgroupN}.`,
        "Downgrade subgroup language and request a larger confirmatory cohort before profile summaries endorse it.",
      ));
    }
    if (claim.modelParameters && claim.events / claim.modelParameters < minEvents) {
      findings.push(finding(
        "high",
        "EVENTS_PER_PARAMETER_TOO_LOW",
        "Model has too few events per parameter",
        `${claim.id} has ${claim.events} events for ${claim.modelParameters} model parameters.`,
        "Hold model-performance claims until event-count adequacy or penalized modeling evidence is provided.",
      ));
    }
  });

  return findings;
}

function evaluateStatisticalPower(manuscript, context) {
  const endpointReviews = manuscript.endpoints.map((endpoint) => reviewEndpoint(endpoint, context));
  const findings = endpointReviews.flatMap((endpoint) => endpoint.findings);
  findings.push(...reviewSubgroups(manuscript, context));

  const highConfidenceClaim = manuscript.claims.some((claim) => claim.confidence === "high" && claim.requiresPowerEvidence);
  if (highConfidenceClaim && findings.some((item) => item.severity === "blocker" || item.severity === "high")) {
    findings.push(finding(
      "high",
      "AI_SUMMARY_CONFIDENCE_TOO_HIGH",
      "AI summary confidence exceeds statistical-power evidence",
      "At least one high-confidence manuscript claim depends on underpowered or weakly justified evidence.",
      "Reduce AI summary confidence and surface the statistical-power caveat to reviewers.",
    ));
  }

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "hold-claim-for-power-review"
    : high
      ? "manual-statistical-review"
      : findings.length
        ? "publish-with-power-caveats"
        : "sufficient-power-evidence";

  const packet = {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    reviewedAt: context.reviewDate,
    decision,
    riskScore,
    endpointReviews: endpointReviews.map((endpoint) => ({
      endpointId: endpoint.endpointId,
      role: endpoint.role,
      enrolledN: endpoint.enrolledN,
      effectiveN: endpoint.effectiveN,
      requiredN: endpoint.requiredN,
      plannedPower: endpoint.plannedPower,
    })),
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-data-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Statistical Power Review",
    "",
    `Manuscript: ${result.title}`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Endpoint Checks",
  ];
  result.endpointReviews.forEach((endpoint) => {
    lines.push(`- ${endpoint.endpointId}: effective n=${endpoint.effectiveN}, required n=${endpoint.requiredN}, planned power=${endpoint.plannedPower || "not reported"}`);
  });
  lines.push("", "## Findings");
  if (!result.findings.length) {
    lines.push("- No statistical-power issues detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }
  lines.push("", "## Safety", "- Synthetic manuscript packet only; no patient data, private manuscripts, live statistics services, credentials, or external APIs.");
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
  const color = result.decision === "hold-claim-for-power-review"
    ? "#b42318"
    : result.decision === "sufficient-power-evidence"
      ? "#067647"
      : "#b54708";
  const bars = result.endpointReviews.map((endpoint, index) => {
    const y = 190 + index * 54;
    const ratio = endpoint.requiredN ? Math.min(1, endpoint.effectiveN / endpoint.requiredN) : 0;
    return `<text x="36" y="${y}" font-family="Arial" font-size="18" fill="#344054">${escapeXml(endpoint.endpointId)}</text>
  <rect x="250" y="${y - 20}" width="420" height="24" rx="4" fill="#eaecf0"/>
  <rect x="250" y="${y - 20}" width="${Math.round(420 * ratio)}" height="24" rx="4" fill="${ratio >= 1 ? "#12b76a" : "#f04438"}"/>
  <text x="690" y="${y}" font-family="Arial" font-size="18" fill="#344054">n=${endpoint.effectiveN}/${endpoint.requiredN}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="430" viewBox="0 0 960 430" role="img" aria-label="Statistical power review summary">
  <rect width="960" height="430" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="382" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Statistical Power Review Assistant</text>
  <rect x="36" y="98" width="390" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="454" y="129" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${bars}
  <text x="36" y="382" font-family="Arial" font-size="18" fill="#667085">Synthetic manuscript data only. No live statistics service calls.</text>
</svg>
`;
}

module.exports = {
  digest,
  effectiveSampleSize,
  evaluateStatisticalPower,
  renderMarkdownReport,
  renderSvgSummary,
  requiredSampleSize,
};
