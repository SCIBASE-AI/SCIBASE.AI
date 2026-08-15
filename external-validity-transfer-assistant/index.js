const DEFAULT_WEIGHTS = {
  critical: 35,
  high: 22,
  medium: 12,
  low: 6
};

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of (values || []).filter(Boolean)) {
    if (seen.has(value)) {
      repeated.add(value);
    }
    seen.add(value);
  }
  return [...repeated];
}

function toScopeSet(records, key) {
  return new Set(records.map((record) => record[key]).filter(Boolean));
}

function missingFromScope(expected, observed) {
  const observedSet = observed instanceof Set ? observed : new Set(observed);
  return unique(expected).filter((value) => !observedSet.has(value));
}

function hasExternalValidation(records) {
  return records.some((record) => record.externalValidation || record.type === "external-validation");
}

function hasRunnableEvidence(records) {
  return records.some((record) => record.reproducible && record.environment);
}

function severityForMissing(count, expectedCount) {
  if (count === 0) {
    return null;
  }
  if (expectedCount >= 3 && count >= 2) {
    return "high";
  }
  if (count === expectedCount) {
    return "high";
  }
  return "medium";
}

function addFinding(findings, severity, rule, message, action) {
  findings.push({ severity, rule, message, action });
}

function evaluateClaim(claim, evidence, manuscript) {
  const evidenceRecords = Array.isArray(evidence) ? evidence : [];
  const evidenceIds = unique(Array.isArray(claim.evidenceIds) ? claim.evidenceIds : []);
  const linkedEvidence = evidenceRecords.filter((record) => evidenceIds.includes(record.id));
  const linkedEvidenceIds = new Set(linkedEvidence.map((record) => record.id));
  const unresolvedEvidenceIds = evidenceIds.filter((id) => !linkedEvidenceIds.has(id));
  const duplicateLinkedEvidenceIds = duplicates(linkedEvidence.map((record) => record.id));
  const findings = [];
  const scope = claim.assertedScope || {};

  if (linkedEvidence.length === 0) {
    addFinding(
      findings,
      "critical",
      "missing-evidence",
      `Claim ${claim.id} has no linked evidence artifacts.`,
      "Link at least one dataset, runbook, protocol, or validation artifact before review."
    );
  }

  if (unresolvedEvidenceIds.length > 0) {
    addFinding(
      findings,
      linkedEvidence.length === 0 ? "critical" : "high",
      "unresolved-evidence-links",
      `Claim ${claim.id} references evidence artifacts that are not present: ${unresolvedEvidenceIds.join(", ")}.`,
      "Repair or remove every unresolved evidence reference before the review packet is released."
    );
  }

  if (duplicateLinkedEvidenceIds.length > 0) {
    addFinding(
      findings,
      "critical",
      "ambiguous-evidence-identifiers",
      `Claim ${claim.id} resolves to duplicate evidence identifiers: ${duplicateLinkedEvidenceIds.join(", ")}.`,
      "Assign globally unique evidence identifiers and re-link the claim before review."
    );
  }

  const observedPopulations = toScopeSet(linkedEvidence, "population");
  const observedSettings = toScopeSet(linkedEvidence, "setting");
  const observedInstruments = toScopeSet(linkedEvidence, "instrument");
  const observedEnvironments = toScopeSet(linkedEvidence, "environment");

  const missingPopulations = missingFromScope(scope.populations, observedPopulations);
  const missingSettings = missingFromScope(scope.settings, observedSettings);
  const missingInstruments = missingFromScope(scope.instruments, observedInstruments);
  const missingEnvironments = missingFromScope(scope.environments, observedEnvironments);

  const populationSeverity = severityForMissing(missingPopulations.length, (scope.populations || []).length);
  if (populationSeverity) {
    addFinding(
      findings,
      populationSeverity,
      "population-transfer-gap",
      `Claim ${claim.id} asserts populations not represented in linked evidence: ${missingPopulations.join(", ")}.`,
      "Narrow the claim wording or add external validation for each missing population."
    );
  }

  const settingSeverity = severityForMissing(missingSettings.length, (scope.settings || []).length);
  if (settingSeverity) {
    addFinding(
      findings,
      settingSeverity,
      "setting-transfer-gap",
      `Claim ${claim.id} asserts settings not represented in linked evidence: ${missingSettings.join(", ")}.`,
      "Add site-level validation evidence or mark the setting as a future research gap."
    );
  }

  if (missingInstruments.length > 0) {
    addFinding(
      findings,
      "medium",
      "assay-transfer-gap",
      `Claim ${claim.id} references unsupported assay or instrument contexts: ${missingInstruments.join(", ")}.`,
      "Separate assay-specific claims and document conversion limits before reviewer release."
    );
  }

  if (missingEnvironments.length > 0) {
    addFinding(
      findings,
      "medium",
      "runtime-transfer-gap",
      `Claim ${claim.id} references runtime environments not covered by rerun evidence: ${missingEnvironments.join(", ")}.`,
      "Run the pipeline in each deployment-like environment or downgrade deployment readiness language."
    );
  }

  const broadScope = (scope.populations || []).length > 1 || (scope.settings || []).length > 1;
  if (broadScope && !hasExternalValidation(linkedEvidence)) {
    addFinding(
      findings,
      "high",
      "no-external-validation",
      `Claim ${claim.id} has broad transfer language without external validation evidence.`,
      "Hold broad generalizability language until at least one independent validation artifact is linked."
    );
  }

  if (!hasRunnableEvidence(linkedEvidence)) {
    addFinding(
      findings,
      "high",
      "no-runnable-transfer-evidence",
      `Claim ${claim.id} lacks reproducible runtime evidence for the asserted context.`,
      "Add a deterministic runbook, manifest, or notebook rerun before the assistant marks the claim reproducible."
    );
  }

  const missingRequiredSubgroups = missingFromScope(manuscript.requiredSubgroups || [], observedPopulations);
  if (claim.confidence === "strong" && missingRequiredSubgroups.length > 0) {
    addFinding(
      findings,
      "medium",
      "strong-claim-subgroup-undercoverage",
      `Strong claim ${claim.id} does not cover required subgroup evidence: ${missingRequiredSubgroups.join(", ")}.`,
      "Convert the claim to qualified language or create a subgroup-specific validation plan."
    );
  }

  const score = Math.max(
    0,
    100 - findings.reduce((total, finding) => total + DEFAULT_WEIGHTS[finding.severity], 0)
  );
  const hasCriticalFinding = findings.some((finding) => finding.severity === "critical");

  return {
    id: claim.id,
    text: claim.text,
    score,
    decision: linkedEvidence.length === 0 || hasCriticalFinding
      ? "quarantine-from-review-packet"
      : decisionFromScore(score),
    evidenceCount: linkedEvidence.length,
    observedScope: {
      populations: [...observedPopulations],
      settings: [...observedSettings],
      instruments: [...observedInstruments],
      environments: [...observedEnvironments],
      externalValidation: hasExternalValidation(linkedEvidence),
      runnableEvidence: hasRunnableEvidence(linkedEvidence)
    },
    findings
  };
}

function decisionFromScore(score) {
  if (score >= 82) {
    return "review-ready";
  }
  if (score >= 62) {
    return "revise-before-release";
  }
  if (score >= 42) {
    return "hold-for-transfer-evidence";
  }
  return "quarantine-from-review-packet";
}

function summarizeSeverity(claimReviews) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const review of claimReviews) {
    for (const finding of review.findings) {
      summary[finding.severity] += 1;
    }
  }
  return summary;
}

function createResearchGaps(project, claimReviews) {
  const missingTerms = new Set();
  for (const review of claimReviews) {
    for (const finding of review.findings) {
      if (finding.rule.includes("population") || finding.rule.includes("subgroup")) {
        for (const value of review.text.match(/pediatric|underrepresented ancestry|adult/g) || []) {
          missingTerms.add(value);
        }
      }
      if (finding.rule.includes("setting") || finding.rule.includes("runtime")) {
        for (const value of review.text.match(/low-resource clinic|community hospital|international site|cpu-only/g) || []) {
          missingTerms.add(value);
        }
      }
    }
  }

  const generated = project.corpusSignals
    .filter((signal) => signal.labFit.some((capability) => project.labCapabilities.includes(capability)))
    .map((signal) => ({
      id: signal.id,
      topic: signal.topic,
      reason: signal.reason,
      priority: missingTerms.size > 0 ? "high" : "medium",
      suggestedNextStep: `Use ${signal.topic} as a targeted validation or grant-planning workstream.`
    }));

  return generated.slice(0, 5);
}

function createReproducibilityActions(claimReviews) {
  const actions = [];
  for (const review of claimReviews) {
    for (const finding of review.findings) {
      if (finding.rule.includes("runtime") || finding.rule.includes("runnable") || finding.rule.includes("external")) {
        actions.push({
          claimId: review.id,
          priority: finding.severity === "high" || finding.severity === "critical" ? "blocking" : "recommended",
          action: finding.action
        });
      }
    }
  }
  return actions;
}

function buildReviewPacket(project) {
  const safeProject = project || {};
  const manuscript = safeProject.manuscript || {};
  const claims = Array.isArray(manuscript.claims) ? manuscript.claims : [];
  const evidence = Array.isArray(safeProject.evidence) ? safeProject.evidence : [];
  const claimReviews = claims.map((claim) =>
    evaluateClaim(claim, evidence, manuscript)
  );
  const severitySummary = summarizeSeverity(claimReviews);
  const averageScore = claimReviews.length === 0
    ? 0
    : Math.round(claimReviews.reduce((total, review) => total + review.score, 0) / claimReviews.length);
  const packetDecision = claimReviews.length === 0 || severitySummary.critical > 0
    ? "quarantine-from-review-packet"
    : decisionFromScore(averageScore);

  return {
    projectId: safeProject.id || "unidentified-project",
    title: safeProject.title || "Untitled research project",
    assistant: "external-validity-transfer-assistant",
    issue: "SCIBASE-AI/SCIBASE.AI#16",
    averageScore,
    decision: packetDecision,
    severitySummary,
    claimReviews,
    peerReviewSuggestions: claimReviews.flatMap((review) =>
      review.findings.map((finding) => ({
        claimId: review.id,
        severity: finding.severity,
        suggestion: finding.message,
        action: finding.action
      }))
    ),
    reproducibilityActions: createReproducibilityActions(claimReviews),
    researchGaps: createResearchGaps({
      corpusSignals: Array.isArray(safeProject.corpusSignals) ? safeProject.corpusSignals : [],
      labCapabilities: Array.isArray(safeProject.labCapabilities) ? safeProject.labCapabilities : []
    }, claimReviews),
    safetyNotes: [
      "Synthetic data only.",
      "No external APIs, credentials, private manuscripts, or live clinical data are used.",
      "The assistant produces deterministic review packets suitable for pre-submission review."
    ]
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderMarkdownReport(packet) {
  const lines = [
    `# ${packet.title}`,
    "",
    `Assistant: ${packet.assistant}`,
    `Overall decision: ${packet.decision}`,
    `Average transfer score: ${packet.averageScore}`,
    "",
    "## Severity Summary",
    "",
    `- Critical: ${packet.severitySummary.critical}`,
    `- High: ${packet.severitySummary.high}`,
    `- Medium: ${packet.severitySummary.medium}`,
    `- Low: ${packet.severitySummary.low}`,
    "",
    "## Claim Reviews",
    ""
  ];

  for (const review of packet.claimReviews) {
    lines.push(`### ${review.id}`);
    lines.push("");
    lines.push(`Decision: ${review.decision}`);
    lines.push(`Score: ${review.score}`);
    lines.push(`Evidence artifacts: ${review.evidenceCount}`);
    if (review.findings.length === 0) {
      lines.push("- No transfer-risk findings.");
    } else {
      for (const finding of review.findings) {
        lines.push(`- ${finding.severity.toUpperCase()} ${finding.rule}: ${finding.message}`);
        lines.push(`  Action: ${finding.action}`);
      }
    }
    lines.push("");
  }

  lines.push("## Reproducibility Actions");
  lines.push("");
  for (const action of packet.reproducibilityActions) {
    lines.push(`- ${action.priority}: ${action.claimId} - ${action.action}`);
  }

  lines.push("");
  lines.push("## Research Gap Prompts");
  lines.push("");
  for (const gap of packet.researchGaps) {
    lines.push(`- ${gap.priority}: ${gap.topic} - ${gap.reason}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const barWidth = Math.max(10, packet.averageScore * 4);
  const statusColor = packet.averageScore >= 62 ? "#2563eb" : "#b91c1c";
  const rows = packet.claimReviews
    .map((review, index) => {
      const y = 130 + index * 52;
      const width = Math.max(10, review.score * 4);
      return [
        `<text x="40" y="${y}" font-size="18" fill="#0f172a">${escapeXml(review.id)}</text>`,
        `<rect x="40" y="${y + 12}" width="400" height="16" rx="4" fill="#e2e8f0"/>`,
        `<rect x="40" y="${y + 12}" width="${width}" height="16" rx="4" fill="#0f766e"/>`,
        `<text x="460" y="${y + 26}" font-size="16" fill="#334155">${review.score} - ${review.decision}</text>`
      ].join("\n");
    })
    .join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360">`,
    `<rect width="900" height="360" fill="#f8fafc"/>`,
    `<text x="40" y="48" font-size="28" font-family="Arial, sans-serif" fill="#0f172a">External Validity Transfer Assistant</text>`,
    `<text x="40" y="82" font-size="18" font-family="Arial, sans-serif" fill="#475569">Average transfer score</text>`,
    `<rect x="250" y="62" width="400" height="20" rx="5" fill="#e2e8f0"/>`,
    `<rect x="250" y="62" width="${barWidth}" height="20" rx="5" fill="${statusColor}"/>`,
    `<text x="670" y="80" font-size="18" font-family="Arial, sans-serif" fill="#0f172a">${packet.averageScore} - ${packet.decision}</text>`,
    rows,
    `<text x="40" y="330" font-size="14" font-family="Arial, sans-serif" fill="#64748b">Synthetic deterministic demo. No credentials, private manuscripts, or external APIs.</text>`,
    `</svg>`
  ].join("\n");
}

module.exports = {
  buildReviewPacket,
  escapeXml,
  evaluateClaim,
  renderMarkdownReport,
  renderSvgSummary
};
