const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 32,
  high: 17,
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

function ids(items) {
  return new Set((items || []).map((item) => item.id));
}

function verifyRegistration(protocol, manuscript) {
  const findings = [];

  if (!protocol.registrationId || !protocol.registeredAt) {
    findings.push(finding(
      "blocker",
      "PREREGISTRATION_MISSING",
      "Protocol lacks preregistration metadata",
      `${protocol.id} registrationId=${protocol.registrationId || "missing"} registeredAt=${protocol.registeredAt || "missing"}.`,
      "Require a preregistration identifier or label the manuscript as non-preregistered.",
    ));
  }

  if (protocol.registeredAt && manuscript.firstEnrollmentAt && new Date(protocol.registeredAt) > new Date(manuscript.firstEnrollmentAt)) {
    findings.push(finding(
      "blocker",
      "REGISTRATION_AFTER_ENROLLMENT",
      "Protocol registration happened after enrollment began",
      `${protocol.id} registeredAt=${protocol.registeredAt} firstEnrollmentAt=${manuscript.firstEnrollmentAt}.`,
      "Prevent AI summaries from calling the work prospective until timing is explained.",
    ));
  }

  return findings;
}

function verifyEndpoints(protocol, manuscript) {
  const findings = [];
  const planned = ids(protocol.endpoints);

  (manuscript.endpoints || []).forEach((endpoint) => {
    if (!planned.has(endpoint.id)) {
      findings.push(finding(
        endpoint.role === "primary" ? "blocker" : "high",
        "UNPLANNED_ENDPOINT_REPORTED",
        "Manuscript reports an endpoint not present in the protocol",
        `${endpoint.id} appears as ${endpoint.role} but was not preregistered.`,
        "Mark the endpoint exploratory unless a dated amendment explains the addition.",
      ));
    }
  });

  (protocol.endpoints || []).forEach((endpoint) => {
    const reported = (manuscript.endpoints || []).find((candidate) => candidate.id === endpoint.id);
    if (!reported) {
      findings.push(finding(
        endpoint.role === "primary" ? "high" : "medium",
        "PLANNED_ENDPOINT_NOT_REPORTED",
        "Planned endpoint is missing from the manuscript",
        `${endpoint.id} was preregistered as ${endpoint.role} but is absent.`,
        "Ask authors to report the endpoint or explain why it was dropped.",
      ));
      return;
    }

    if (reported.role !== endpoint.role) {
      findings.push(finding(
        "high",
        "ENDPOINT_ROLE_CHANGED",
        "Endpoint role changed from the preregistered hierarchy",
        `${endpoint.id} planned=${endpoint.role} reported=${reported.role}.`,
        "Preserve the preregistered hierarchy in AI summaries or require amendment evidence.",
      ));
    }
  });

  return findings;
}

function verifyAnalysisPlan(protocol, manuscript) {
  const findings = [];
  const planned = ids(protocol.analysisPlan?.models);

  (manuscript.analysis?.models || []).forEach((model) => {
    if (!planned.has(model.id)) {
      findings.push(finding(
        "high",
        "UNPLANNED_ANALYSIS_MODEL",
        "Analysis model was not in the preregistered plan",
        `${model.id} appears in the manuscript but not the protocol.`,
        "Label the analysis as post hoc unless a preregistered amendment covers it.",
      ));
    }

    if (model.tuningAfterOutcomeReview && !model.amendmentId) {
      findings.push(finding(
        "blocker",
        "OUTCOME_INFORMED_MODEL_TUNING",
        "Model was tuned after outcome review without amendment",
        `${model.id} was tuned after outcome review with no amendment ID.`,
        "Block high-confidence AI interpretation until model-tuning provenance is reviewed.",
      ));
    }
  });

  return findings;
}

function verifyExclusions(protocol, manuscript) {
  const findings = [];
  const plannedReasons = new Set(protocol.exclusionCriteria || []);

  (manuscript.exclusions || []).forEach((exclusion) => {
    if (!plannedReasons.has(exclusion.reason)) {
      findings.push(finding(
        "high",
        "UNPLANNED_EXCLUSION_REASON",
        "Exclusion reason was not preregistered",
        `${exclusion.count} records excluded for ${exclusion.reason}.`,
        "Require sensitivity analysis with and without the unplanned exclusion.",
      ));
    }

    if (exclusion.afterOutcomeReview && !exclusion.blindedReview) {
      findings.push(finding(
        "blocker",
        "OUTCOME_AWARE_EXCLUSION",
        "Exclusion was decided after outcome review without blinding",
        `${exclusion.reason} exclusions were outcome-aware.`,
        "Block confirmatory language until an independent blinded review is documented.",
      ));
    }
  });

  return findings;
}

function verifyAmendments(protocol, manuscript) {
  const findings = [];
  const amendments = new Map((protocol.amendments || []).map((amendment) => [amendment.id, amendment]));

  (manuscript.declaredAmendments || []).forEach((declared) => {
    const amendment = amendments.get(declared.id);
    if (!amendment) {
      findings.push(finding(
        "high",
        "DECLARED_AMENDMENT_NOT_FOUND",
        "Manuscript references an amendment missing from protocol records",
        `${declared.id} is declared in the manuscript but absent from protocol amendments.`,
        "Attach the dated protocol amendment or remove unsupported amendment language.",
      ));
      return;
    }

    if (!amendment.timestamp || new Date(amendment.timestamp) > new Date(declared.analysisStartedAt)) {
      findings.push(finding(
        "high",
        "AMENDMENT_TIMESTAMP_TOO_LATE",
        "Protocol amendment timestamp is missing or after analysis began",
        `${declared.id} timestamp=${amendment.timestamp || "missing"} analysisStartedAt=${declared.analysisStartedAt}.`,
        "Treat the amendment as post hoc unless timestamp provenance is corrected.",
      ));
    }
  });

  return findings;
}

function verifyAiSummary(manuscript, findings) {
  const summaryFindings = [];
  const hasHighRisk = findings.some((item) => item.severity === "blocker" || item.severity === "high");

  if (hasHighRisk && manuscript.aiSummary?.confidence === "high") {
    summaryFindings.push(finding(
      "high",
      "AI_SUMMARY_OVERSTATES_CONFIRMATORY_STATUS",
      "AI summary confidence is too high for protocol-deviation evidence",
      "The manuscript has high-risk protocol deviations while the AI summary reports high confidence.",
      "Lower AI summary confidence and surface preregistration caveats to reviewers.",
    ));
  }

  if (hasHighRisk && !manuscript.aiSummary?.includesProtocolCaveat) {
    summaryFindings.push(finding(
      "medium",
      "AI_SUMMARY_PROTOCOL_CAVEAT_MISSING",
      "AI summary omits protocol-deviation caveats",
      "Protocol deviation findings are present but the summary does not mention them.",
      "Add a structured protocol-deviation caveat to the AI-generated review.",
    ));
  }

  return summaryFindings;
}

function reviewProtocolDeviations(protocol, manuscript, context = {}) {
  const baseFindings = [
    ...verifyRegistration(protocol, manuscript),
    ...verifyEndpoints(protocol, manuscript),
    ...verifyAnalysisPlan(protocol, manuscript),
    ...verifyExclusions(protocol, manuscript),
    ...verifyAmendments(protocol, manuscript),
  ];
  const findings = [
    ...baseFindings,
    ...verifyAiSummary(manuscript, baseFindings),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "hold-confirmatory-claim"
    : high
      ? "manual-protocol-review"
      : findings.length
        ? "publish-with-protocol-caveats"
        : "protocol-aligned";

  const packet = {
    manuscriptId: manuscript.id,
    protocolId: protocol.id,
    reviewedAt: context.reviewDate,
    decision,
    riskScore,
    plannedEndpointCount: (protocol.endpoints || []).length,
    reportedEndpointCount: (manuscript.endpoints || []).length,
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-protocol-data-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Protocol Deviation Review",
    "",
    `Manuscript: ${result.manuscriptId}`,
    `Protocol: ${result.protocolId}`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
  ];

  if (!result.findings.length) {
    lines.push("- No protocol deviation issues detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }

  lines.push("", "## Safety", "- Synthetic protocol/manuscript data only; no patient data, private manuscripts, registry services, credentials, or external APIs.");
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
  const color = result.decision === "hold-confirmatory-claim"
    ? "#b42318"
    : result.decision === "protocol-aligned"
      ? "#067647"
      : "#b54708";
  const severityCounts = ["blocker", "high", "medium", "low"].map((severity) => ({
    severity,
    count: result.findings.filter((item) => item.severity === severity).length,
  }));
  const maxCount = Math.max(...severityCounts.map((item) => item.count), 1);
  const bars = severityCounts.map((item, index) => {
    const y = 205 + index * 52;
    const width = Math.round(460 * item.count / maxCount);
    const fill = item.severity === "blocker" ? "#7a271a" : item.severity === "high" ? "#b42318" : item.severity === "medium" ? "#f79009" : "#667085";
    return `<text x="36" y="${y}" font-family="Arial" font-size="18" fill="#344054">${escapeXml(item.severity)}</text>
  <rect x="190" y="${y - 22}" width="460" height="28" rx="5" fill="#eaecf0"/>
  <rect x="190" y="${y - 22}" width="${width}" height="28" rx="5" fill="${fill}"/>
  <text x="676" y="${y}" font-family="Arial" font-size="18" fill="#344054">${item.count}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="450" viewBox="0 0 960 450" role="img" aria-label="Protocol deviation review summary">
  <rect width="960" height="450" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="402" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Protocol Deviation Review</text>
  <rect x="36" y="98" width="390" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="456" y="129" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${bars}
  <text x="36" y="416" font-family="Arial" font-size="18" fill="#667085">Synthetic protocol data only. No registry or manuscript service calls.</text>
</svg>
`;
}

module.exports = {
  digest,
  reviewProtocolDeviations,
  renderMarkdownReport,
  renderSvgSummary,
};
