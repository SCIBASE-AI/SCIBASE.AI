const SEVERITY_ORDER = { block: 3, warn: 2, info: 1 };

function issue(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function isBinaryOutcome(packet) {
  return packet.declaredPrimaryModel?.outcomeType === "binary";
}

function usesLinearIdentityModel(packet) {
  const model = packet.declaredPrimaryModel || {};
  return model.family === "linear-regression" || model.linkFunction === "identity";
}

function assumptionsMentioned(packet) {
  const claims = packet.reviewerClaims || [];
  return claims.some((claim) => /assumption|diagnostic|limitation/i.test(claim));
}

export function reviewModelAssumptions(packet) {
  if (!packet || typeof packet !== "object") {
    throw new TypeError("analysis packet must be an object");
  }

  const diagnostics = packet.diagnostics || {};
  const remediation = packet.remediationEvidence || {};
  const findings = [];

  if (isBinaryOutcome(packet) && usesLinearIdentityModel(packet)) {
    findings.push(
      issue(
        "MODEL_FAMILY_OUTCOME_MISMATCH",
        "block",
        "Binary outcomes should not be released through an identity-link linear model without an explicit sensitivity justification.",
        {
          outcomeType: packet.declaredPrimaryModel?.outcomeType,
          family: packet.declaredPrimaryModel?.family,
          linkFunction: packet.declaredPrimaryModel?.linkFunction,
        },
        "Refit with a logistic or mixed-effects logistic model, or add a documented sensitivity analysis before AI review conclusions are trusted.",
      ),
    );
  }

  if (diagnostics.eventCount && diagnostics.predictors && diagnostics.eventCount / diagnostics.predictors < 5) {
    findings.push(
      issue(
        "LOW_EVENTS_PER_PREDICTOR",
        "block",
        "The event-per-predictor ratio is too low for stable adjusted effects.",
        {
          eventCount: diagnostics.eventCount,
          predictors: diagnostics.predictors,
          eventsPerPredictor: Number((diagnostics.eventCount / diagnostics.predictors).toFixed(2)),
        },
        "Reduce predictors, use penalization, or present the model as exploratory until stability is demonstrated.",
      ),
    );
  }

  if (diagnostics.completeSeparationIndicators > 0) {
    findings.push(
      issue(
        "SEPARATION_RISK",
        "block",
        "Separation indicators suggest coefficient estimates may be unstable or infinite.",
        { completeSeparationIndicators: diagnostics.completeSeparationIndicators },
        "Use penalized logistic regression or exact methods and report the separation diagnostic in the reviewer packet.",
      ),
    );
  }

  if (diagnostics.breuschPaganPValue < 0.05 && !diagnostics.robustStandardErrorsDeclared) {
    findings.push(
      issue(
        "HETEROSCEDASTICITY_UNHANDLED",
        "warn",
        "Residual variance is not constant and no robust standard errors were declared.",
        { breuschPaganPValue: diagnostics.breuschPaganPValue },
        "Report robust or clustered standard errors and flag affected inference in the limitations section.",
      ),
    );
  }

  if (diagnostics.maxVarianceInflationFactor > 8) {
    findings.push(
      issue(
        "MULTICOLLINEARITY_HIGH",
        "warn",
        "Predictors show high variance inflation, so independent-effect claims may be overstated.",
        { maxVarianceInflationFactor: diagnostics.maxVarianceInflationFactor },
        "Collapse correlated predictors, use regularization, or downgrade independent-effect language.",
      ),
    );
  }

  if (diagnostics.residualSkew > 1.25 || diagnostics.outlierStudentizedResidualMax > 4) {
    findings.push(
      issue(
        "RESIDUAL_OUTLIER_PRESSURE",
        "warn",
        "Residual skew or influential outliers are large enough to require sensitivity reporting.",
        {
          residualSkew: diagnostics.residualSkew,
          outlierStudentizedResidualMax: diagnostics.outlierStudentizedResidualMax,
        },
        "Add influence diagnostics, robust fit sensitivity, and a reviewer-facing note describing impacted claims.",
      ),
    );
  }

  if (diagnostics.durbinWatson && (diagnostics.durbinWatson < 1.4 || diagnostics.durbinWatson > 2.6)) {
    findings.push(
      issue(
        "AUTOCORRELATION_RISK",
        "warn",
        "Residual autocorrelation may invalidate nominal uncertainty estimates.",
        { durbinWatson: diagnostics.durbinWatson },
        "Model temporal or batch correlation explicitly, or use clustered uncertainty estimates.",
      ),
    );
  }

  if (diagnostics.clusterCount && diagnostics.clusterCount < 5) {
    findings.push(
      issue(
        "TOO_FEW_CLUSTERS",
        "warn",
        "Cluster-adjusted claims are fragile with very few clusters.",
        { clusterCount: diagnostics.clusterCount, smallestClusterSize: diagnostics.smallestClusterSize },
        "Report cluster limitations and avoid generalizing beyond the observed sites or batches.",
      ),
    );
  }

  if (!diagnostics.calibrationReported && isBinaryOutcome(packet)) {
    findings.push(
      issue(
        "CALIBRATION_MISSING",
        "warn",
        "Binary prediction claims need calibration evidence before reviewer summaries treat them as reliable.",
        { calibrationReported: diagnostics.calibrationReported },
        "Add calibration curve, Brier score, or held-out calibration summary.",
      ),
    );
  }

  if (!remediation.sensitivityModelIncluded || !remediation.reviewerPacketLinksDiagnostics) {
    findings.push(
      issue(
        "REVIEW_PACKET_INCOMPLETE",
        "block",
        "The reviewer handoff is missing sensitivity evidence or links to diagnostics.",
        {
          sensitivityModelIncluded: remediation.sensitivityModelIncluded,
          reviewerPacketLinksDiagnostics: remediation.reviewerPacketLinksDiagnostics,
        },
        "Hold automated peer-review approval until the handoff packet includes diagnostics and sensitivity results.",
      ),
    );
  }

  if (findings.length > 0 && assumptionsMentioned(packet) && !remediation.limitationTextMentionsAssumptionRisk) {
    findings.push(
      issue(
        "OVERCONFIDENT_ASSUMPTION_CLAIM",
        "warn",
        "The manuscript claims diagnostics were considered but does not disclose assumption risk in limitations.",
        { limitationTextMentionsAssumptionRisk: remediation.limitationTextMentionsAssumptionRisk },
        "Add limitation language that names the specific modeling assumptions still under review.",
      ),
    );
  }

  const blockCount = findings.filter((finding) => finding.severity === "block").length;
  const warnCount = findings.filter((finding) => finding.severity === "warn").length;
  const riskScore = Math.min(100, blockCount * 28 + warnCount * 11);
  const decision = blockCount > 0 ? "hold-ai-review" : warnCount > 0 ? "needs-reviewer-note" : "ready-for-ai-review";

  return {
    manuscriptId: packet.manuscriptId,
    title: packet.title,
    decision,
    riskScore,
    summary: {
      blockCount,
      warnCount,
      findingCount: findings.length,
    },
    findings: findings.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || a.code.localeCompare(b.code)),
  };
}

export function buildReviewerMarkdown(report) {
  const lines = [
    `# Model Assumption Diagnostics: ${report.manuscriptId}`,
    "",
    `Decision: **${report.decision}**`,
    `Risk score: **${report.riskScore}/100**`,
    "",
    `Findings: ${report.summary.blockCount} blockers, ${report.summary.warnCount} warnings.`,
    "",
  ];

  for (const finding of report.findings) {
    lines.push(`## ${finding.severity.toUpperCase()}: ${finding.code}`);
    lines.push(finding.message);
    lines.push("");
    lines.push(`Evidence: \`${JSON.stringify(finding.evidence)}\``);
    lines.push("");
    lines.push(`Remediation: ${finding.remediation}`);
    lines.push("");
  }

  if (report.findings.length === 0) {
    lines.push("No assumption blockers or warnings were detected in the synthetic packet.");
    lines.push("");
  }

  return lines.join("\n");
}

export function buildSummarySvg(report) {
  const blockers = report.summary.blockCount;
  const warnings = report.summary.warnCount;
  const safe = Math.max(0, 10 - blockers - warnings);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="420" viewBox="0 0 920 420" role="img" aria-label="Model assumption diagnostics summary">
  <rect width="920" height="420" fill="#0e1726"/>
  <text x="48" y="66" fill="#f8fafc" font-family="Arial, sans-serif" font-size="30" font-weight="700">Model Assumption Diagnostics</text>
  <text x="48" y="106" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="17">${escapeXml(report.manuscriptId)} · ${escapeXml(report.decision)}</text>
  <rect x="48" y="148" width="${Math.min(760, report.riskScore * 7.6)}" height="34" rx="5" fill="${report.decision === "hold-ai-review" ? "#ef4444" : "#f59e0b"}"/>
  <rect x="48" y="148" width="760" height="34" rx="5" fill="none" stroke="#334155"/>
  <text x="824" y="173" fill="#f8fafc" font-family="Arial, sans-serif" font-size="20" text-anchor="end">${report.riskScore}/100</text>
  <g transform="translate(48 230)">
    <rect width="210" height="106" rx="8" fill="#1e293b"/>
    <text x="24" y="42" fill="#fecaca" font-family="Arial, sans-serif" font-size="28" font-weight="700">${blockers}</text>
    <text x="24" y="76" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="16">blockers</text>
  </g>
  <g transform="translate(288 230)">
    <rect width="210" height="106" rx="8" fill="#1e293b"/>
    <text x="24" y="42" fill="#fde68a" font-family="Arial, sans-serif" font-size="28" font-weight="700">${warnings}</text>
    <text x="24" y="76" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="16">warnings</text>
  </g>
  <g transform="translate(528 230)">
    <rect width="210" height="106" rx="8" fill="#1e293b"/>
    <text x="24" y="42" fill="#bbf7d0" font-family="Arial, sans-serif" font-size="28" font-weight="700">${safe}</text>
    <text x="24" y="76" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="16">assumption checks clear</text>
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
