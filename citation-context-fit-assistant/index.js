const SEVERITY_WEIGHTS = {
  critical: 34,
  high: 20,
  medium: 10,
  low: 4
};

function addFinding(findings, severity, rule, message, action, refs = []) {
  findings.push({ severity, rule, message, action, refs });
}

function yearsOld(asOfDate, year) {
  return new Date(asOfDate).getUTCFullYear() - year;
}

function isValidDate(value) {
  return typeof value === "string" && value.trim() !== "" && Number.isFinite(new Date(value).getTime());
}

function duplicateIds(items) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }
    seen.add(item.id);
  }
  return [...duplicates];
}

function claimById(project) {
  return new Map(project.manuscript.highlightedClaims.map((claim) => [claim.id, claim]));
}

function validateCitationEvidenceIntegrity(project, findings) {
  if (!isValidDate(project.asOfDate)) {
    addFinding(
      findings,
      "critical",
      "citation-packet-date-invalid",
      "The citation packet has no valid as-of date.",
      "Repair the packet timestamp before evaluating citation recency.",
      [String(project.asOfDate)]
    );
  }

  for (const duplicateId of duplicateIds(project.manuscript.highlightedClaims)) {
    addFinding(
      findings,
      "critical",
      "claim-id-duplicate",
      `Highlighted claim identifier ${duplicateId} appears more than once.`,
      "Resolve claim-anchor ambiguity before evaluating or inserting citations.",
      [String(duplicateId)]
    );
  }

  for (const duplicateId of duplicateIds(project.candidates)) {
    addFinding(
      findings,
      "critical",
      "citation-candidate-id-duplicate",
      `Citation candidate identifier ${duplicateId} appears more than once.`,
      "Resolve candidate identity ambiguity before one-click insertion.",
      [String(duplicateId)]
    );
  }

  const allowedRelations = new Set(["supports", "contradicts", "contextualizes", "irrelevant"]);
  const allowedIntents = new Set(["direct-support", "background", "method", "contrast"]);
  const asOfYear = isValidDate(project.asOfDate) ? new Date(project.asOfDate).getUTCFullYear() : null;

  for (const candidate of project.candidates) {
    for (const field of ["evidenceStrength", "fieldOverlap"]) {
      if (!Number.isFinite(candidate[field]) || candidate[field] < 0 || candidate[field] > 1) {
        addFinding(
          findings,
          "critical",
          "citation-score-invalid",
          `${candidate.id} has invalid ${field} value ${candidate[field]}.`,
          "Repair normalized citation evidence scores before evaluating insertion safety.",
          [candidate.id, field, String(candidate[field])]
        );
      }
    }

    if (!Number.isInteger(candidate.year) || candidate.year < 1000 || (asOfYear !== null && candidate.year > asOfYear)) {
      addFinding(
        findings,
        "critical",
        "citation-year-invalid",
        `${candidate.id} has invalid or future publication year ${candidate.year}.`,
        "Verify publication chronology before evaluating citation recency.",
        [candidate.id, String(candidate.year)]
      );
    }

    if (!allowedRelations.has(candidate.relation)) {
      addFinding(
        findings,
        "critical",
        "citation-relation-invalid",
        `${candidate.id} has unsupported relation ${candidate.relation}.`,
        "Classify the candidate as support, contradiction, context, or irrelevant before insertion.",
        [candidate.id, String(candidate.relation)]
      );
    }

    if (candidate.citationIntent && !allowedIntents.has(candidate.citationIntent)) {
      addFinding(
        findings,
        "critical",
        "citation-intent-invalid",
        `${candidate.id} has unsupported citation intent ${candidate.citationIntent}.`,
        "Use an approved citation-intent label before insertion.",
        [candidate.id, String(candidate.citationIntent)]
      );
    }
  }
}

function evaluateCandidate(project, claim, candidate, findings) {
  if (!claim) {
    addFinding(
      findings,
      "critical",
      "citation-claim-anchor-missing",
      `${candidate.id} references missing highlighted claim ${candidate.claimId}.`,
      "Block insertion until the citation is attached to a valid manuscript claim.",
      [candidate.id, candidate.claimId]
    );
    return;
  }

  if (project.policy.insertionRequiresIntent && !candidate.citationIntent) {
    addFinding(
      findings,
      "high",
      "citation-intent-missing",
      `${candidate.id} has no citation intent label.`,
      "Require the assistant to label the citation as direct support, background, method, or contrast.",
      [candidate.id, claim.id]
    );
  }

  if (candidate.citationIntent !== claim.intendedCitationRole) {
    addFinding(
      findings,
      "medium",
      "citation-intent-claim-role-mismatch",
      `${candidate.id} intent ${candidate.citationIntent} does not match claim role ${claim.intendedCitationRole}.`,
      "Ask the citation tool to relabel or move the candidate before one-click insertion.",
      [candidate.id, claim.id]
    );
  }

  if (candidate.relation === "irrelevant") {
    addFinding(
      findings,
      "critical",
      "citation-context-irrelevant",
      `${candidate.id} is irrelevant to ${claim.id}.`,
      "Suppress the recommendation from the citation tool.",
      [candidate.id, claim.id]
    );
  }

  if (candidate.relation === "contradicts" && claim.intendedCitationRole === "direct-support") {
    addFinding(
      findings,
      "critical",
      "contradictory-citation-for-supporting-claim",
      `${candidate.id} contradicts a claim that requested direct support.`,
      "Block one-click insertion unless the manuscript text is rewritten as a contrast or limitation.",
      [candidate.id, claim.id]
    );
  }

  if (candidate.relation === "contradicts" && project.policy.allowContradictoryOnlyWithNote && !candidate.insertionNote) {
    addFinding(
      findings,
      "high",
      "contradictory-citation-note-missing",
      `${candidate.id} is contradictory but has no insertion note.`,
      "Require an explicit contrast note before insertion.",
      [candidate.id, claim.id]
    );
  }

  if (candidate.citationIntent === "direct-support" && candidate.evidenceStrength < project.policy.minimumSupportStrength) {
    addFinding(
      findings,
      "high",
      "direct-support-evidence-too-weak",
      `${candidate.id} evidence strength ${candidate.evidenceStrength} is below support threshold.`,
      "Downgrade the candidate to background/context or require a stronger source.",
      [candidate.id, claim.id]
    );
  }

  if (candidate.fieldOverlap < project.policy.minimumFieldOverlap) {
    addFinding(
      findings,
      "high",
      "citation-field-fit-too-low",
      `${candidate.id} field overlap ${candidate.fieldOverlap} is below the accepted threshold.`,
      "Hold the candidate for manual review or retrieve a field-matched citation.",
      [candidate.id, claim.id, candidate.field]
    );
  }

  if (
    isValidDate(project.asOfDate) &&
    Number.isInteger(candidate.year) &&
    yearsOld(project.asOfDate, candidate.year) > project.policy.staleEvidenceYears &&
    candidate.citationIntent !== "background"
  ) {
    addFinding(
      findings,
      "medium",
      "citation-evidence-stale-for-claim",
      `${candidate.id} is ${yearsOld(project.asOfDate, candidate.year)} years old for a non-background claim.`,
      "Ask the citation tool to retrieve fresher evidence or mark this as historical context.",
      [candidate.id, String(candidate.year)]
    );
  }

  if (candidate.relation === "contextualizes" && candidate.citationIntent === "direct-support") {
    addFinding(
      findings,
      "high",
      "context-only-citation-used-as-support",
      `${candidate.id} only contextualizes ${claim.id} but is labeled direct support.`,
      "Change the insertion label to background or select a direct evidence source.",
      [candidate.id, claim.id]
    );
  }
}

function evaluateCitationFit(project) {
  const findings = [];
  const claims = claimById(project);

  validateCitationEvidenceIntegrity(project, findings);

  for (const candidate of project.candidates) {
    evaluateCandidate(project, claims.get(candidate.claimId), candidate, findings);
  }

  const decisions = project.candidates.map((candidate) => {
    const candidateFindings = findings.filter((finding) => finding.refs.includes(candidate.id));
    const hasCritical = candidateFindings.some((finding) => finding.severity === "critical");
    const hasHigh = candidateFindings.some((finding) => finding.severity === "high");
    return {
      candidateId: candidate.id,
      claimId: candidate.claimId,
      decision: hasCritical ? "suppress" : hasHigh ? "manual-review" : "allow-insertion",
      rules: candidateFindings.map((finding) => finding.rule)
    };
  });

  const severitySummary = findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + SEVERITY_WEIGHTS[finding.severity], 0));

  return { findings, decisions, severitySummary, score };
}

function decisionFromEvaluation(evaluation) {
  if (evaluation.severitySummary.critical > 0) {
    return "block-unsafe-citation-insertions";
  }
  if (evaluation.severitySummary.high > 0 || evaluation.score < 75) {
    return "hold-citations-for-manual-review";
  }
  if (evaluation.score < 90) {
    return "review-citation-context-before-insertion";
  }
  return "citation-context-fit-ready";
}

function buildReviewPacket(project) {
  const evaluation = evaluateCitationFit(project);
  return {
    assistant: "citation-context-fit-assistant",
    issue: "SCIBASE-AI/SCIBASE.AI#13",
    manuscriptId: project.manuscript.id,
    title: project.manuscript.title,
    asOfDate: project.asOfDate,
    decision: decisionFromEvaluation(evaluation),
    score: evaluation.score,
    severitySummary: evaluation.severitySummary,
    findings: evaluation.findings,
    insertionDecisions: evaluation.decisions,
    safety: [
      "Synthetic manuscript claims and citation candidates only",
      "No DOI, Crossref, PubMed, arXiv, Semantic Scholar, publisher, or external corpus calls",
      "No private manuscripts, credentials, real literature metadata, or live citation insertions"
    ]
  };
}

function renderMarkdownReport(packet) {
  const lines = [
    "# Citation Context-Fit Assistant",
    "",
    `Manuscript: ${packet.title}`,
    `Issue: ${packet.issue}`,
    `Decision: ${packet.decision}`,
    `Score: ${packet.score}`,
    "",
    "## Insertion Decisions",
    ""
  ];

  for (const decision of packet.insertionDecisions) {
    lines.push(`- ${decision.candidateId} for ${decision.claimId}: ${decision.decision}`);
    if (decision.rules.length > 0) {
      lines.push(`  - Rules: ${decision.rules.join(", ")}`);
    }
  }

  lines.push("", "## Findings", "");
  for (const finding of packet.findings) {
    lines.push(`- **${finding.severity} / ${finding.rule}**: ${finding.message}`);
    lines.push(`  - Action: ${finding.action}`);
    lines.push(`  - Refs: ${finding.refs.join(", ") || "none"}`);
  }

  lines.push("", "## Safety", "");
  for (const item of packet.safety) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const scoreWidth = Math.max(44, Math.min(760, packet.score * 7.6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Citation context fit assistant summary">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="66" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Citation Context-Fit Assistant</text>
  <text x="48" y="104" font-family="Arial" font-size="18" fill="#475569">${packet.title}</text>
  <rect x="48" y="142" width="864" height="94" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="181" font-family="Arial" font-size="21" font-weight="700" fill="#b91c1c">${packet.decision}</text>
  <text x="76" y="213" font-family="Arial" font-size="17" fill="#334155">Critical ${packet.severitySummary.critical} | High ${packet.severitySummary.high} | Findings ${packet.findings.length}</text>
  <rect x="48" y="274" width="864" height="76" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="307" font-family="Arial" font-size="18" fill="#334155">Context-fit score</text>
  <rect x="76" y="324" width="760" height="14" rx="7" fill="#e5e7eb"/>
  <rect x="76" y="324" width="${scoreWidth}" height="14" rx="7" fill="#ea580c"/>
  <text x="852" y="339" font-family="Arial" font-size="16" text-anchor="end" fill="#111827">${packet.score}/100</text>
  <rect x="48" y="390" width="864" height="76" rx="8" fill="#fff7ed" stroke="#fdba74"/>
  <text x="76" y="423" font-family="Arial" font-size="18" font-weight="700" fill="#9a3412">Block misleading one-click citations</text>
  <text x="76" y="451" font-family="Arial" font-size="16" fill="#9a3412">Checks support, contradiction, context-only use, field fit, evidence strength, recency, and insertion notes.</text>
</svg>
`;
}

module.exports = {
  buildReviewPacket,
  decisionFromEvaluation,
  evaluateCitationFit,
  renderMarkdownReport,
  renderSvgSummary,
  yearsOld
};
