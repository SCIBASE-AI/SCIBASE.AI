const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const RULES = {
  MISSING_CONFOUNDER_ADJUSTMENT: {
    severity: "high",
    penalty: 18,
    recommendation: "Add the omitted baseline confounders to the adjustment set or downgrade causal language.",
  },
  COLLIDER_ADJUSTMENT: {
    severity: "high",
    penalty: 17,
    recommendation: "Remove collider variables from the primary adjustment set and rerun the sensitivity model.",
  },
  POST_TREATMENT_ADJUSTMENT: {
    severity: "high",
    penalty: 16,
    recommendation: "Do not adjust for mediators or post-treatment variables when estimating the total effect.",
  },
  TEMPORAL_ORDER_VIOLATION: {
    severity: "high",
    penalty: 15,
    recommendation: "Require exposure, confounder, and outcome timestamps that preserve causal ordering.",
  },
  POSITIVITY_VIOLATION: {
    severity: "high",
    penalty: 14,
    recommendation: "Restrict to common-support regions or report the causal estimand as unsupported.",
  },
  NEGATIVE_CONTROL_FAILURE: {
    severity: "medium",
    penalty: 10,
    recommendation: "Investigate residual confounding before presenting the effect as causal.",
  },
  INVALID_INSTRUMENT: {
    severity: "medium",
    penalty: 9,
    recommendation: "Remove the instrument claim or supply exclusion-restriction and relevance evidence.",
  },
  EFFECT_MODIFIER_UNREPORTED: {
    severity: "medium",
    penalty: 8,
    recommendation: "Report stratified estimates or add a limitation for the uncovered effect modifier.",
  },
  UNSUPPORTED_CAUSAL_LANGUAGE: {
    severity: "medium",
    penalty: 8,
    recommendation: "Replace causal wording with association language until design and adjustment evidence are sufficient.",
  },
  WEAK_BALANCE_DIAGNOSTIC: {
    severity: "medium",
    penalty: 7,
    recommendation: "Improve matching/weighting or add balance caveats for imbalanced covariates.",
  },
};

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value, length = 16) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, length);
}

function addFinding(findings, code, message, evidence) {
  const rule = RULES[code];
  findings.push({
    code,
    severity: rule.severity,
    penalty: rule.penalty,
    message,
    evidence,
    recommendation: rule.recommendation,
  });
}

function setOf(values) {
  return new Set(values || []);
}

function findVariable(packet, variableId) {
  return (packet.variables || []).find((variable) => variable.id === variableId);
}

function causalLanguageClaims(packet) {
  const verbs = /\b(causes?|caused|reduces?|reduced|prevents?|prevented|improves?|improved|drives?|driven|protects?|protected)\b/i;
  return (packet.claims || []).filter((claim) => claim.type === "causal" || verbs.test(claim.text || ""));
}

function auditAdjustmentSet(packet, findings) {
  const adjusted = setOf(packet.analysisPlan.adjustedCovariates);
  for (const confounderId of packet.causalGraph.requiredConfounders || []) {
    if (!adjusted.has(confounderId)) {
      const variable = findVariable(packet, confounderId);
      addFinding(
        findings,
        "MISSING_CONFOUNDER_ADJUSTMENT",
        `Required confounder ${confounderId} is missing from the primary adjustment set.`,
        {
          variableId: confounderId,
          label: variable ? variable.label : confounderId,
          role: variable ? variable.role : "confounder",
          adjustedCovariates: packet.analysisPlan.adjustedCovariates,
        },
      );
    }
  }

  for (const variableId of packet.analysisPlan.adjustedCovariates || []) {
    const variable = findVariable(packet, variableId);
    if (!variable) continue;
    if (variable.role === "collider") {
      addFinding(
        findings,
        "COLLIDER_ADJUSTMENT",
        `Collider ${variableId} is included in the primary adjustment set.`,
        { variableId, label: variable.label, colliderReason: variable.rationale || "common effect of exposure and outcome risk" },
      );
    }
    if (variable.role === "mediator" || variable.measuredAfterExposure) {
      addFinding(
        findings,
        "POST_TREATMENT_ADJUSTMENT",
        `Post-treatment variable ${variableId} is included in the total-effect adjustment set.`,
        { variableId, label: variable.label, role: variable.role, measuredAfterExposure: Boolean(variable.measuredAfterExposure) },
      );
    }
  }
}

function auditTemporalOrdering(packet, findings) {
  for (const check of packet.temporalChecks || []) {
    if (!check.passes) {
      addFinding(
        findings,
        "TEMPORAL_ORDER_VIOLATION",
        `Temporal ordering check failed for ${check.id}.`,
        { checkId: check.id, expected: check.expected, observed: check.observed, affectedClaimIds: check.affectedClaimIds || [] },
      );
    }
  }
}

function auditDiagnostics(packet, findings) {
  const diagnostics = packet.diagnostics || {};
  if (typeof diagnostics.minPropensity === "number" && diagnostics.minPropensity < 0.05) {
    addFinding(
      findings,
      "POSITIVITY_VIOLATION",
      "Propensity overlap is too weak for the stated causal estimand.",
      {
        minPropensity: diagnostics.minPropensity,
        maxPropensity: diagnostics.maxPropensity,
        threshold: 0.05,
      },
    );
  }

  for (const balance of diagnostics.balance || []) {
    if (Math.abs(balance.standardizedMeanDifference) > 0.25) {
      addFinding(
        findings,
        "WEAK_BALANCE_DIAGNOSTIC",
        `Covariate ${balance.variableId} remains imbalanced after adjustment.`,
        {
          variableId: balance.variableId,
          standardizedMeanDifference: balance.standardizedMeanDifference,
          threshold: 0.25,
        },
      );
    }
  }

  for (const negativeControl of diagnostics.negativeControls || []) {
    if (negativeControl.expectedNull && Math.abs(negativeControl.effectEstimate) > negativeControl.tolerance) {
      addFinding(
        findings,
        "NEGATIVE_CONTROL_FAILURE",
        `Negative control ${negativeControl.id} shows a non-null effect.`,
        {
          controlId: negativeControl.id,
          effectEstimate: negativeControl.effectEstimate,
          tolerance: negativeControl.tolerance,
          pValue: negativeControl.pValue,
        },
      );
    }
  }
}

function auditInstruments(packet, findings) {
  for (const instrument of packet.instrumentChecks || []) {
    if (!instrument.exclusionRestrictionSupported || !instrument.relevanceSupported) {
      addFinding(
        findings,
        "INVALID_INSTRUMENT",
        `Instrument ${instrument.variableId} lacks required validity evidence.`,
        {
          variableId: instrument.variableId,
          relevanceSupported: Boolean(instrument.relevanceSupported),
          exclusionRestrictionSupported: Boolean(instrument.exclusionRestrictionSupported),
          concern: instrument.concern || "instrument validity incomplete",
        },
      );
    }
  }
}

function auditEffectModifiers(packet, findings) {
  const reported = setOf(packet.analysisPlan.reportedStrata);
  for (const modifier of packet.effectModifiers || []) {
    if (modifier.required && !reported.has(modifier.variableId)) {
      addFinding(
        findings,
        "EFFECT_MODIFIER_UNREPORTED",
        `Required effect modifier ${modifier.variableId} is not reported as a stratum or interaction.`,
        { variableId: modifier.variableId, reason: modifier.reason, reportedStrata: packet.analysisPlan.reportedStrata || [] },
      );
    }
  }
}

function auditCausalLanguage(packet, findings) {
  const claims = causalLanguageClaims(packet);
  if (claims.length === 0) return;
  const design = packet.studyDesign || {};
  const strongDesign = ["randomized_trial", "natural_experiment"].includes(design.type);
  const adjustmentReady = findings.every((finding) => !["MISSING_CONFOUNDER_ADJUSTMENT", "COLLIDER_ADJUSTMENT", "POST_TREATMENT_ADJUSTMENT"].includes(finding.code));
  if (!strongDesign && !adjustmentReady) {
    for (const claim of claims) {
      addFinding(
        findings,
        "UNSUPPORTED_CAUSAL_LANGUAGE",
        `Claim ${claim.id} uses causal language without sufficient design and adjustment evidence.`,
        { claimId: claim.id, text: claim.text, designType: design.type, evidenceIds: claim.evidenceIds || [] },
      );
    }
  }
}

function summarize(findings) {
  const severityCounts = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) severityCounts[finding.severity] += 1;
  const penalty = findings.reduce((sum, finding) => sum + finding.penalty, 0);
  const riskScore = Math.min(100, penalty);
  let decision = "ready-for-causal-language";
  if (severityCounts.high > 0 || riskScore >= 50) decision = "hold-causal-claim";
  else if (severityCounts.medium > 0) decision = "needs-methods-review";
  return { severityCounts, riskScore, decision };
}

function auditCausalAdjustment(packet, options = {}) {
  if (!packet || typeof packet !== "object") throw new TypeError("packet must be an object");
  const normalized = {
    variables: [],
    claims: [],
    causalGraph: { requiredConfounders: [] },
    analysisPlan: { adjustedCovariates: [], reportedStrata: [] },
    ...packet,
  };
  const findings = [];

  auditAdjustmentSet(normalized, findings);
  auditTemporalOrdering(normalized, findings);
  auditDiagnostics(normalized, findings);
  auditInstruments(normalized, findings);
  auditEffectModifiers(normalized, findings);
  auditCausalLanguage(normalized, findings);

  const summary = summarize(findings);
  const evidenceDigest = digest({
    studyId: normalized.studyId,
    design: normalized.studyDesign,
    claims: normalized.claims,
    analysisPlan: normalized.analysisPlan,
    findings,
  });

  return {
    studyId: normalized.studyId,
    title: normalized.title,
    generatedAt: options.now || "2026-05-28T20:45:00.000Z",
    decision: summary.decision,
    riskScore: summary.riskScore,
    severityCounts: summary.severityCounts,
    findingCount: findings.length,
    evidenceDigest,
    summary: {
      variables: normalized.variables.length,
      claims: normalized.claims.length,
      requiredConfounders: normalized.causalGraph.requiredConfounders.length,
      adjustedCovariates: normalized.analysisPlan.adjustedCovariates.length,
      temporalChecks: (normalized.temporalChecks || []).length,
      negativeControls: ((normalized.diagnostics || {}).negativeControls || []).length,
    },
    findings,
  };
}

function createMarkdownReport(report) {
  const findings = report.findings.length
    ? report.findings
        .map(
          (finding, index) => [
            `### ${index + 1}. ${finding.code} (${finding.severity})`,
            finding.message,
            "",
            `Recommendation: ${finding.recommendation}`,
            "",
            "Evidence:",
            "```json",
            JSON.stringify(finding.evidence, null, 2),
            "```",
          ].join("\n"),
        )
        .join("\n\n")
    : "No blocking findings.";

  return [
    "# Causal Adjustment Review",
    "",
    `Study: ${report.title || report.studyId}`,
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}/100`,
    `Evidence digest: ${report.evidenceDigest}`,
    "",
    "## Scope",
    "",
    `Variables: ${report.summary.variables}`,
    `Claims: ${report.summary.claims}`,
    `Required confounders: ${report.summary.requiredConfounders}`,
    `Adjusted covariates: ${report.summary.adjustedCovariates}`,
    `Temporal checks: ${report.summary.temporalChecks}`,
    `Negative controls: ${report.summary.negativeControls}`,
    "",
    "## Findings",
    "",
    findings,
    "",
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createSummarySvg(report) {
  const riskWidth = Math.max(0, Math.min(1, report.riskScore / 100)) * 560;
  const color = report.decision === "ready-for-causal-language" ? "#168a4a" : report.decision === "needs-methods-review" ? "#b7791f" : "#b91c1c";
  const findingRows = report.findings
    .slice(0, 5)
    .map(
      (finding, index) =>
        `<text x="72" y="${342 + index * 36}" fill="#334155" font-family="Arial, sans-serif" font-size="20">${escapeXml(
          finding.code,
        )}: ${escapeXml(finding.message).slice(0, 92)}</text>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="72" y="98" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Causal Adjustment Review Assistant</text>
  <text x="72" y="140" fill="#475569" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.title || report.studyId)}</text>
  <text x="72" y="198" fill="${color}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(report.decision)}</text>
  <text x="72" y="242" fill="#334155" font-family="Arial, sans-serif" font-size="22">Risk ${report.riskScore}/100 · findings ${
    report.findingCount
  } · digest ${escapeXml(report.evidenceDigest)}</text>
  <rect x="72" y="270" width="560" height="24" rx="12" fill="#e2e8f0"/>
  <rect x="72" y="270" width="${riskWidth}" height="24" rx="12" fill="${color}"/>
  <text x="72" y="324" fill="#0f172a" font-family="Arial, sans-serif" font-size="24" font-weight="700">Top findings</text>
  ${findingRows}
  <text x="72" y="642" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Synthetic manuscript packet only. No private data, external APIs, live patients, or model services.</text>
</svg>
`;
}

function writeAuditReports(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "causal-adjustment-review.json");
  const markdownPath = path.join(outputDir, "causal-adjustment-review.md");
  const svgPath = path.join(outputDir, "causal-adjustment-summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, createMarkdownReport(report));
  fs.writeFileSync(svgPath, createSummarySvg(report));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  RULES,
  auditCausalAdjustment,
  createMarkdownReport,
  createSummarySvg,
  digest,
  stableStringify,
  writeAuditReports,
};
