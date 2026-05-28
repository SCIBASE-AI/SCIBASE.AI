const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 28,
  high: 18,
  medium: 9,
  low: 4,
};

function percent(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

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

function makeDigest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function calculateAttrition(arm) {
  const randomized = Number(arm.randomized || 0);
  const analyzed = Number(arm.analyzed || 0);
  if (!randomized) {
    return 0;
  }
  return Math.max(0, randomized - analyzed) / randomized;
}

function outcomeMissingness(study) {
  const primary = study.variables.find((variable) => variable.role === "primary-outcome");
  if (!primary) {
    return null;
  }
  const values = Object.values(primary.missingByArm || {}).map(Number);
  const totalRandomized = study.arms.reduce((sum, arm) => sum + Number(arm.randomized || 0), 0);
  const missing = values.reduce((sum, value) => sum + value, 0);
  return {
    variable: primary,
    missing,
    rate: totalRandomized ? missing / totalRandomized : 0,
  };
}

function addFinding(findings, severity, code, title, evidence, action, requirement) {
  findings.push({
    severity,
    code,
    title,
    evidence,
    action,
    requirement,
  });
}

function analyzeMissingData(study) {
  const findings = [];
  const arms = study.arms || [];
  const attritionRates = arms.map((arm) => ({ arm: arm.name, rate: calculateAttrition(arm) }));
  const maxAttrition = Math.max(0, ...attritionRates.map((item) => item.rate));
  const minAttrition = Math.min(...attritionRates.map((item) => item.rate));
  const attritionSpread = maxAttrition - minAttrition;
  const primaryMissing = outcomeMissingness(study);
  const missingDataPlan = study.analysisPlan && study.analysisPlan.missingDataPlan;
  const sensitivity = (study.analysisPlan && study.analysisPlan.sensitivityAnalyses) || [];
  const imputation = (study.analysisPlan && study.analysisPlan.imputation) || {};
  const claims = study.claims || [];

  if (maxAttrition >= 0.2 || attritionSpread >= 0.1) {
    addFinding(
      findings,
      maxAttrition >= 0.25 || attritionSpread >= 0.15 ? "high" : "medium",
      "ATTRITION_IMBALANCE",
      "Attrition is high or imbalanced across arms",
      `Arm attrition ranges from ${percent(minAttrition)} to ${percent(maxAttrition)}; spread is ${percent(attritionSpread)}.`,
      "Add a CONSORT-style attrition table, explain arm-specific loss, and run an attrition sensitivity analysis.",
      "Auto peer-review reports should flag reproducibility and statistical rigor risks."
    );
  }

  if (primaryMissing && primaryMissing.rate >= 0.12 && !missingDataPlan) {
    addFinding(
      findings,
      primaryMissing.rate >= 0.2 ? "blocker" : "high",
      "NO_MISSING_DATA_PLAN",
      "Primary outcome missingness lacks a prespecified handling plan",
      `${primaryMissing.variable.name} has ${primaryMissing.missing} missing values (${percent(primaryMissing.rate)} of randomized participants).`,
      "Specify the missing-data estimand, assumptions, imputation model, and sensitivity analyses before reviewer-ready claims are generated.",
      "Assistant must produce reviewer-ready action packets for reproducibility gaps."
    );
  }

  const weakImputationPattern = /\b(single|mean imputation|last observation carried forward|locf)\b/i;
  if (imputation.method && weakImputationPattern.test(imputation.method)) {
    addFinding(
      findings,
      "high",
      "WEAK_IMPUTATION_METHOD",
      "Confirmatory analysis relies on weak imputation",
      `Configured imputation method is "${imputation.method}".`,
      "Use multiple imputation or a justified likelihood-based model, report diagnostics, and compare complete-case, imputed, and MNAR scenarios.",
      "Assistant should detect statistical methodology risks before peer-review packets are shown."
    );
  }

  const mechanismFlags = (study.missingnessEvidence || []).filter((item) => item.signal === "outcome-related" || item.signal === "nonrandom");
  const hasMnarSensitivity = sensitivity.some((item) => /mnar|delta|tipping|pattern mixture|selection model/i.test(item));
  if (mechanismFlags.length && !hasMnarSensitivity) {
    addFinding(
      findings,
      "high",
      "MISSING_MNAR_SENSITIVITY",
      "Outcome-related missingness has no MNAR sensitivity analysis",
      mechanismFlags.map((item) => `${item.variable}: ${item.detail}`).join("; "),
      "Add delta-adjusted, tipping-point, pattern-mixture, or selection-model sensitivity scenarios and calibrate claim strength to the worst credible scenario.",
      "Research-gap and reproducibility checks should surface missing sensitivity evidence."
    );
  }

  if (study.effectEstimates) {
    const completeCase = study.effectEstimates.completeCase;
    const imputed = study.effectEstimates.imputed;
    const sensitivityWorst = study.effectEstimates.sensitivityWorst;
    if (completeCase && imputed) {
      const denominator = Math.max(0.01, Math.abs(imputed.estimate));
      const relativeShift = Math.abs(completeCase.estimate - imputed.estimate) / denominator;
      const directionFlip = Math.sign(completeCase.estimate) !== Math.sign(imputed.estimate);
      if (relativeShift >= 0.25 || directionFlip) {
        addFinding(
          findings,
          directionFlip ? "blocker" : "high",
          "ESTIMATE_INSTABILITY",
          "Complete-case and imputed estimates materially disagree",
          `Complete-case estimate ${completeCase.estimate}; imputed estimate ${imputed.estimate}; relative shift ${percent(relativeShift)}.`,
          "Report both estimates, explain the assumed missingness mechanism, and avoid definitive language until sensitivity estimates are reconciled.",
          "AI review output should calibrate claims against analysis stability."
        );
      }
    }
    if (sensitivityWorst && sensitivityWorst.supportsClaim === false) {
      addFinding(
        findings,
        "high",
        "SENSITIVITY_UNDERCUTS_CLAIM",
        "Worst credible missing-data scenario undercuts the main claim",
        sensitivityWorst.summary,
        "Downgrade the conclusion, disclose the sensitivity result, and mark the finding as exploratory or unresolved.",
        "Assistant should connect analysis checks to claim-strength calibration."
      );
    }
  }

  const unknownReasonCount = (study.dropoutReasons || []).reduce((sum, reason) => {
    if (/unknown|not reported|unexplained/i.test(reason.reason)) {
      return sum + Number(reason.count || 0);
    }
    return sum;
  }, 0);
  const totalDropoutReasons = (study.dropoutReasons || []).reduce((sum, reason) => sum + Number(reason.count || 0), 0);
  if (totalDropoutReasons && unknownReasonCount / totalDropoutReasons >= 0.35) {
    addFinding(
      findings,
      "medium",
      "UNEXPLAINED_DROPOUT",
      "Dropout reasons are not reviewer-ready",
      `${unknownReasonCount} of ${totalDropoutReasons} dropout reasons are unknown or not reported.`,
      "Resolve or group dropout reasons and identify whether missingness is plausibly independent of outcome.",
      "Peer-review assistant should surface documentation gaps."
    );
  }

  const highMissingPrimary = primaryMissing && primaryMissing.rate >= 0.15;
  claims
    .filter((claim) => claim.usesCompleteCaseOnly && highMissingPrimary)
    .forEach((claim) => {
      addFinding(
        findings,
        "medium",
        "OVERSTATED_COMPLETE_CASE_CLAIM",
        "Claim wording is stronger than the missing-data evidence supports",
        `Claim "${claim.text}" relies on complete-case-only evidence while primary outcome missingness is ${percent(primaryMissing.rate)}.`,
        "Calibrate language to conditional complete-case evidence or require imputed and MNAR sensitivity support.",
        "Assistant should produce reviewer-ready claim revision tasks."
      );
    });

  const riskScore = Math.min(
    100,
    findings.reduce((sum, finding) => sum + SEVERITY_WEIGHT[finding.severity], 0)
  );
  const blockers = findings.filter((finding) => finding.severity === "blocker").length;
  const high = findings.filter((finding) => finding.severity === "high").length;
  const decision = blockers || high >= 2 ? "hold-review" : high === 1 ? "revise-before-review" : "ready-with-notes";
  const actions = findings.map((finding) => ({
    code: finding.code,
    owner: finding.severity === "blocker" || finding.severity === "high" ? "statistical-reviewer" : "author",
    action: finding.action,
  }));
  const packet = {
    studyId: study.id,
    title: study.title,
    decision,
    riskScore,
    attritionRates,
    findings,
    actions,
    generatedFrom: "synthetic-data-only",
  };
  return {
    ...packet,
    auditDigest: makeDigest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    `# Missing Data Sensitivity Review: ${result.title}`,
    "",
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Attrition",
    ...result.attritionRates.map((item) => `- ${item.arm}: ${percent(item.rate)}`),
    "",
    "## Findings",
  ];
  if (!result.findings.length) {
    lines.push("- No blocking missing-data findings.");
  } else {
    result.findings.forEach((finding) => {
      lines.push(`- [${finding.severity}] ${finding.title}: ${finding.evidence}`);
      lines.push(`  Action: ${finding.action}`);
    });
  }
  lines.push("", "## Safety", "- Synthetic data only; no external services or private project data.");
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
  const statusColor = result.decision === "hold-review" ? "#b42318" : result.decision === "revise-before-review" ? "#b54708" : "#067647";
  const findings = result.findings.slice(0, 5);
  const findingRows = findings
    .map((finding, index) => {
      const y = 210 + index * 52;
      return `<text x="56" y="${y}" fill="#111827" font-size="20" font-family="Arial">${escapeXml(finding.severity.toUpperCase())}: ${escapeXml(finding.title).slice(0, 74)}</text>
<text x="56" y="${y + 25}" fill="#475467" font-size="15" font-family="Arial">${escapeXml(finding.code)}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#f7f8fa"/>
<rect x="36" y="36" width="1208" height="648" rx="18" fill="#ffffff" stroke="#d0d5dd"/>
<text x="56" y="88" fill="#101828" font-size="32" font-family="Arial" font-weight="700">Missing Data Sensitivity Assistant</text>
<text x="56" y="126" fill="#475467" font-size="20" font-family="Arial">${escapeXml(result.title)}</text>
<rect x="56" y="150" width="260" height="42" rx="8" fill="${statusColor}"/>
<text x="74" y="178" fill="#ffffff" font-size="20" font-family="Arial" font-weight="700">${escapeXml(result.decision.toUpperCase())}</text>
<text x="344" y="178" fill="#101828" font-size="22" font-family="Arial">Risk score: ${result.riskScore}</text>
${findingRows}
<text x="56" y="640" fill="#667085" font-size="18" font-family="Arial">Audit digest: ${escapeXml(result.auditDigest)} | Synthetic data only | No external services</text>
</svg>`;
}

module.exports = {
  analyzeMissingData,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  makeDigest,
};
