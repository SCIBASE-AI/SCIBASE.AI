const DEFAULTS = {
  minimumAlpha: 0.7,
  minimumLoading: 0.5,
  maximumCrossLoading: 0.32,
  minimumLikertAnchors: 5,
  cfaCasesPerParameter: 10
};

function addFinding(findings, severity, code, message, evidence) {
  findings.push({ severity, code, message, evidence });
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function evaluateScale(scale, findings, options) {
  if (typeof scale.cronbachAlpha !== "number") {
    addFinding(
      findings,
      "high",
      "missing_internal_consistency",
      `${scale.name} does not report Cronbach alpha or equivalent reliability evidence.`,
      { scale: scale.name }
    );
  } else if (scale.cronbachAlpha < options.minimumAlpha) {
    addFinding(
      findings,
      "high",
      "low_internal_consistency",
      `${scale.name} reports alpha ${scale.cronbachAlpha}, below ${options.minimumAlpha}.`,
      { scale: scale.name, alpha: scale.cronbachAlpha }
    );
  }

  for (const item of scale.items ?? []) {
    if (item.reverseCoded && !item.reverseScored) {
      addFinding(
        findings,
        "critical",
        "reverse_coding_drift",
        `${item.id} is reverse coded but not reverse scored before scale scoring.`,
        { scale: scale.name, itemId: item.id }
      );
    }

    if (typeof item.loading === "number" && item.loading < options.minimumLoading) {
      addFinding(
        findings,
        "medium",
        "weak_primary_loading",
        `${item.id} has primary loading ${item.loading}, below ${options.minimumLoading}.`,
        { scale: scale.name, itemId: item.id, loading: item.loading }
      );
    }
  }

  for (const cross of scale.crossLoadings ?? []) {
    if (cross.secondaryLoading >= options.maximumCrossLoading) {
      addFinding(
        findings,
        "high",
        "factor_cross_loading",
        `${cross.itemId} has secondary loading ${cross.secondaryLoading}, above ${options.maximumCrossLoading}.`,
        { scale: scale.name, itemId: cross.itemId, secondaryLoading: cross.secondaryLoading }
      );
    }
  }
}

export function evaluateSurveyPacket(packet, customOptions = {}) {
  const options = { ...DEFAULTS, ...customOptions };
  const findings = [];

  const anchors = packet.likertAnchors ?? [];
  if (anchors.length < options.minimumLikertAnchors) {
    addFinding(
      findings,
      "medium",
      "thin_likert_anchor_set",
      `Survey reports ${anchors.length} Likert anchors; expected at least ${options.minimumLikertAnchors}.`,
      { anchors }
    );
  }

  const minimumCfaSample = (packet.plannedCfaParameters ?? 0) * options.cfaCasesPerParameter;
  if (packet.plannedCfaParameters && packet.sampleSize < minimumCfaSample) {
    addFinding(
      findings,
      "high",
      "cfa_sample_size_shortfall",
      `CFA sample size ${packet.sampleSize} is below ${minimumCfaSample} for ${packet.plannedCfaParameters} parameters.`,
      {
        sampleSize: packet.sampleSize,
        plannedCfaParameters: packet.plannedCfaParameters,
        minimumCfaSample
      }
    );
  }

  for (const scale of packet.scales ?? []) {
    evaluateScale(scale, findings, options);
  }

  const scaleConstructs = new Set((packet.scales ?? []).map((scale) => normalize(scale.construct)));
  for (const claim of packet.constructClaims ?? []) {
    if (!scaleConstructs.has(normalize(claim))) {
      addFinding(
        findings,
        "high",
        "construct_claim_mismatch",
        `Manuscript claims ${claim}, but no submitted scale validates that construct directly.`,
        { claim, availableConstructs: [...scaleConstructs] }
      );
    }
  }

  const severityScore = findings.reduce((sum, finding) => {
    if (finding.severity === "critical") return sum + 5;
    if (finding.severity === "high") return sum + 3;
    if (finding.severity === "medium") return sum + 1;
    return sum;
  }, 0);

  const decision = findings.some((finding) => finding.severity === "critical") || severityScore >= 9
    ? "HOLD"
    : severityScore >= 3
      ? "REVIEW"
      : "RELEASE";

  return {
    packetId: packet.id,
    title: packet.title,
    decision,
    severityScore,
    findingCount: findings.length,
    findings,
    releaseGate: {
      canReleaseAiReview: decision === "RELEASE",
      requiresPsychometricReviewer: decision !== "RELEASE",
      rationale: decision === "RELEASE"
        ? "Psychometric evidence is sufficient for AI peer-review release."
        : "Psychometric validity issues must be reviewed before AI output is trusted."
    }
  };
}

export function renderMarkdownReport(result) {
  const lines = [
    `# Survey Psychometric Validity Report`,
    ``,
    `Packet: ${result.packetId}`,
    `Decision: ${result.decision}`,
    `Severity score: ${result.severityScore}`,
    `Findings: ${result.findingCount}`,
    ``,
    `## Findings`
  ];

  if (result.findings.length === 0) {
    lines.push(`- No blocking psychometric validity findings.`);
  } else {
    for (const finding of result.findings) {
      lines.push(`- [${finding.severity}] ${finding.code}: ${finding.message}`);
    }
  }

  lines.push(
    ``,
    `## Release gate`,
    `- Can release AI review: ${result.releaseGate.canReleaseAiReview}`,
    `- Requires psychometric reviewer: ${result.releaseGate.requiresPsychometricReviewer}`,
    `- Rationale: ${result.releaseGate.rationale}`
  );

  return `${lines.join("\n")}\n`;
}
