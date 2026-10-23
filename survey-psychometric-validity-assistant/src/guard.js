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
      `${scale.name} does not report Cronbach alpha; alternative reliability coefficients are not evaluated by this module.`,
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

    if (typeof item.loading === "number" && Math.abs(item.loading) < options.minimumLoading) {
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
    if (Math.abs(cross.secondaryLoading) >= options.maximumCrossLoading) {
      addFinding(
        findings,
        "high",
        "factor_cross_loading",
        `${cross.itemId} has secondary loading ${cross.secondaryLoading}, with magnitude at or above ${options.maximumCrossLoading}.`,
        { scale: scale.name, itemId: cross.itemId, secondaryLoading: cross.secondaryLoading }
      );
    }
  }
}

function validatePacket(packet) {
  const errors = [];
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const text = value => typeof value === "string" && value.trim().length > 0;
  const number = value => typeof value === "number" && Number.isFinite(value);
  const check = (ok, path) => { if (!ok) errors.push(path); };
  if (!object(packet)) return ["packet must be an object"];
  for (const key of ["id", "title"]) check(text(packet[key]), key);
  check(Number.isInteger(packet.sampleSize) && packet.sampleSize > 0, "sampleSize");
  check(Number.isInteger(packet.plannedCfaParameters) && packet.plannedCfaParameters >= 0, "plannedCfaParameters (use 0 when CFA is not planned)");
  check(Array.isArray(packet.likertAnchors) && packet.likertAnchors.length > 0 && packet.likertAnchors.every(text) && new Set(packet.likertAnchors.map(normalize)).size === packet.likertAnchors.length, "likertAnchors: nonempty, unique labels required");
  check(Array.isArray(packet.constructClaims) && packet.constructClaims.length > 0 && packet.constructClaims.every(text), "constructClaims");
  check(Array.isArray(packet.scales) && packet.scales.length > 0, "scales");
  const scaleNames = new Set();
  const allIds = new Set();
  for (const [index, scale] of (Array.isArray(packet.scales) ? packet.scales : []).entries()) {
    const path = `scales[${index}]`;
    if (!object(scale)) { errors.push(path); continue; }
    check(text(scale.name) && !scaleNames.has(normalize(scale.name)), `${path}.name`);
    scaleNames.add(normalize(scale.name));
    check(text(scale.construct), `${path}.construct`);
    // Missing alpha is a review finding; non-finite/out-of-range supplied values are invalid input.
    if (scale.cronbachAlpha != null) check(number(scale.cronbachAlpha) && scale.cronbachAlpha <= 1, `${path}.cronbachAlpha`);
    check(Array.isArray(scale.items) && scale.items.length > 0, `${path}.items`);
    const ids = new Set();
    for (const [j, item] of (Array.isArray(scale.items) ? scale.items : []).entries()) {
      if (!object(item)) { errors.push(`${path}.items[${j}]`); continue; }
      check(text(item.id) && !allIds.has(item.id), `${path}.items[${j}].id`);
      ids.add(item.id); allIds.add(item.id);
      check(number(item.loading) && Math.abs(item.loading) <= 1, `${path}.items[${j}].loading`);
      for (const key of ["reverseCoded", "reverseScored"]) if (item[key] !== undefined) check(typeof item[key] === "boolean", `${path}.items[${j}].${key}`);
    }
    check(Array.isArray(scale.crossLoadings), `${path}.crossLoadings (use [] when none are reported)`);
    for (const [j, cross] of (Array.isArray(scale.crossLoadings) ? scale.crossLoadings : []).entries()) {
      check(object(cross) && ids.has(cross.itemId) && number(cross.secondaryLoading) && Math.abs(cross.secondaryLoading) <= 1, `${path}.crossLoadings[${j}]`);
    }
  }
  return errors;
}

export function evaluateSurveyPacket(packet, customOptions = {}) {
  const options = { ...DEFAULTS, ...customOptions };
  for (const [key, value] of Object.entries(options)) {
    if (!(key in DEFAULTS) || !Number.isFinite(value) || value <= 0 ||
        (["minimumAlpha", "minimumLoading", "maximumCrossLoading"].includes(key) && value > 1) ||
        (key === "minimumLikertAnchors" && !Number.isInteger(value))) {
      throw new TypeError(`Invalid option: ${key}`);
    }
  }
  const findings = [];
  const errors = validatePacket(packet);
  if (errors.length) {
    return {
      packetId: packet?.id ?? null, title: packet?.title ?? null,
      decision: "HOLD", severityScore: 5, findingCount: 1,
      findings: [{ severity: "critical", code: "invalid_input", message: "Required psychometric evidence is missing or malformed.", evidence: { paths: errors } }],
      releaseGate: { canReleaseAiReview: false, requiresPsychometricReviewer: true, rationale: "Correct the input before evaluating release readiness." }
    };
  }

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
        `Manuscript claims ${claim}, but no submitted scale has a matching construct label (this is not a validation assessment).`,
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
    : findings.length > 0
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
        ? "No configured metadata checks flagged issues. This does not establish psychometric validity or approve the full AI review."
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
