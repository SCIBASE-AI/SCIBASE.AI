"use strict";

const crypto = require("node:crypto");

const REQUIRED_SUMMARY_MODES = new Set(["abstract", "executive", "layperson"]);
const PEER_REVIEW_CATEGORIES = new Set(["statistics", "ethics", "data-availability", "clarity", "similarity"]);
const LAYPERSON_JARGON = [
  "metabolomic",
  "kynurenine",
  "phosphatidylcholine",
  "perturbations",
  "actigraphy",
];

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

function stableHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => object[field] === undefined || object[field] === null);
  if (missing.length > 0) throw new Error(`${label} is missing required field(s): ${missing.join(", ")}`);
}

function finding(severity, id, title, detail, remediation, targetIds = []) {
  return { severity, id, title, detail, remediation, targetIds };
}

function tokenize(text) {
  return new Set(String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3));
}

function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

function indexById(items, label) {
  return new Map(items.map((item) => {
    requireFields(item, ["id"], label);
    return [item.id, item];
  }));
}

function evidenceOverlap(text, evidence) {
  const textTokens = tokenize(text);
  const evidenceTokens = tokenize(evidence.excerpt || evidence.title || "");
  let overlap = 0;
  for (const token of textTokens) {
    if (evidenceTokens.has(token)) overlap += 1;
  }
  return overlap;
}

function validateEvidenceIds(evidenceIds, evidenceIndex, targetId) {
  const findings = [];
  for (const evidenceId of evidenceIds || []) {
    if (!evidenceIndex.has(evidenceId)) {
      findings.push(finding(
        "blocker",
        "unknown-evidence-id",
        "Output references unknown evidence",
        `${targetId} references evidence ${evidenceId}, which is not in the evidence corpus.`,
        "Use only registered manuscript or reference evidence IDs.",
        [targetId, evidenceId],
      ));
    }
  }
  return findings;
}

function evaluateSummaryMode(summary, evidenceIndex) {
  requireFields(summary, ["mode", "text", "evidenceIds"], "summary");
  const findings = [];
  const summaryId = `summary:${summary.mode}`;
  const count = wordCount(summary.text);

  findings.push(...validateEvidenceIds(summary.evidenceIds, evidenceIndex, summaryId));

  if (!REQUIRED_SUMMARY_MODES.has(summary.mode)) {
    findings.push(finding(
      "warning",
      "unknown-summary-mode",
      "Summary mode is not part of the MVP contract",
      `${summary.mode} is not one of abstract, executive, or layperson.`,
      "Use one of the supported MVP summary modes.",
      [summary.mode],
    ));
  }

  if (summary.evidenceIds.length === 0) {
    findings.push(finding(
      "blocker",
      "summary-evidence-missing",
      "Summary has no evidence spans",
      `${summaryId} does not cite any manuscript evidence.`,
      "Attach evidence IDs for every summary mode before exposing the output.",
      [summary.mode],
    ));
  }

  const supported = summary.evidenceIds.some((evidenceId) => {
    const evidence = evidenceIndex.get(evidenceId);
    return evidence && evidenceOverlap(summary.text, evidence) >= 2;
  });
  if (!supported) {
    findings.push(finding(
      "blocker",
      "summary-not-grounded",
      "Summary text is weakly grounded",
      `${summaryId} has evidence IDs but little lexical overlap with the cited evidence.`,
      "Rewrite the summary with direct support from the cited evidence spans.",
      [summary.mode],
    ));
  }

  if (summary.mode === "abstract") {
    for (const marker of ["objective", "methods", "results", "conclusion"]) {
      if (!summary.text.toLowerCase().includes(marker)) {
        findings.push(finding(
          "warning",
          "abstract-section-missing",
          "Abstract summary is missing a structured marker",
          `The abstract-style summary does not include ${marker}.`,
          "Include objective, methods, results, and conclusion markers.",
          [summary.mode, marker],
        ));
      }
    }
    if (count > 180) {
      findings.push(finding(
        "warning",
        "abstract-too-long",
        "Abstract summary is too long",
        `The abstract summary has ${count} words.`,
        "Keep the abstract-style summary concise.",
        [summary.mode],
      ));
    }
  }

  if (summary.mode === "layperson") {
    const jargon = LAYPERSON_JARGON.filter((term) => summary.text.toLowerCase().includes(term));
    if (jargon.length > 0) {
      findings.push(finding(
        "warning",
        "layperson-jargon",
        "Layperson summary contains unexplained jargon",
        `The layperson summary contains: ${jargon.join(", ")}.`,
        "Replace jargon with plain-language descriptions or define it inline.",
        [summary.mode, ...jargon],
      ));
    }
  }

  for (const field of ["keyFindings", "implications", "nextSteps"]) {
    if (!Array.isArray(summary[field]) || summary[field].length === 0) {
      findings.push(finding(
        "warning",
        "summary-output-section-missing",
        "Summary omits an expected output section",
        `${summaryId} has no ${field}.`,
        "Return key findings, implications, and next steps for collaborator-ready summaries.",
        [summary.mode, field],
      ));
    }
  }

  return {
    mode: summary.mode,
    wordCount: count,
    decision: findings.some((item) => item.severity === "blocker")
      ? "blocked"
      : findings.length > 0 ? "needs-review" : "ready",
    findings,
  };
}

function evaluateSummaryOutputs(summaries, evidenceIndex) {
  const reports = summaries.map((summary) => evaluateSummaryMode(summary, evidenceIndex));
  const modes = new Set(summaries.map((summary) => summary.mode));
  for (const requiredMode of REQUIRED_SUMMARY_MODES) {
    if (!modes.has(requiredMode)) {
      reports.push({
        mode: requiredMode,
        wordCount: 0,
        decision: "needs-review",
        findings: [finding(
          "warning",
          "summary-mode-missing",
          "Expected summary mode is missing",
          `No ${requiredMode} summary was provided.`,
          "Generate all MVP summary modes before marking the workflow complete.",
          [requiredMode],
        )],
      });
    }
  }
  return reports;
}

function evaluatePeerReviewAid(peerReview, manuscript, evidenceIndex) {
  requireFields(peerReview, ["template", "diagnostics", "compliance"], "peer review output");
  const findings = [];
  const categories = new Set(peerReview.diagnostics.map((diagnostic) => diagnostic.category));

  for (const diagnostic of peerReview.diagnostics) {
    requireFields(diagnostic, ["id", "category", "severity", "message", "evidenceIds"], "peer review diagnostic");
    findings.push(...validateEvidenceIds(diagnostic.evidenceIds, evidenceIndex, diagnostic.id));
    if (!PEER_REVIEW_CATEGORIES.has(diagnostic.category)) {
      findings.push(finding(
        "warning",
        "unknown-peer-review-category",
        "Peer-review diagnostic category is not recognized",
        `${diagnostic.id} uses category ${diagnostic.category}.`,
        "Use one of the standard MVP diagnostic categories.",
        [diagnostic.id, diagnostic.category],
      ));
    }
  }

  if (!categories.has("statistics")) {
    findings.push(finding(
      "warning",
      "statistics-diagnostic-missing",
      "Statistical diagnostics are missing",
      "The peer-review aid did not evaluate statistical risks.",
      "Check p-values, confidence intervals, effect sizes, and sample-size reporting.",
      ["statistics"],
    ));
  }

  const statEvidence = [...evidenceIndex.values()].find((item) => /p\s*=\s*0\.08/i.test(item.excerpt || ""));
  const statDiagnostic = peerReview.diagnostics.some((item) => item.category === "statistics" && item.severity !== "info");
  if (statEvidence && !statDiagnostic) {
    findings.push(finding(
      "blocker",
      "pvalue-risk-undetected",
      "P-value interpretation risk was not detected",
      "The evidence corpus contains p = 0.08 described as significant, but no statistical warning was returned.",
      "Add a statistics diagnostic for p-value and confidence interval consistency.",
      ["statistics", statEvidence.id],
    ));
  }

  if (manuscript.requiresEthicsStatement && !peerReview.compliance.ethicsStatement) {
    findings.push(finding(
      "blocker",
      "ethics-statement-missing",
      "Required ethics statement is missing",
      "The manuscript requires ethics documentation but the peer-review output did not find one.",
      "Add or request an ethics statement before submission.",
      ["ethicsStatement"],
    ));
  }

  if (manuscript.requiresDataAvailability && !peerReview.compliance.dataAvailability) {
    findings.push(finding(
      "blocker",
      "data-availability-missing",
      "Required data availability statement is missing",
      "The manuscript requires a data availability statement but none was detected.",
      "Add a data availability statement or explain controlled-access restrictions.",
      ["dataAvailability"],
    ));
  }

  if (peerReview.similarity && peerReview.similarity.score >= 0.35) {
    findings.push(finding(
      "blocker",
      "similarity-score-high",
      "Similarity score requires plagiarism review",
      `Similarity score is ${peerReview.similarity.score}.`,
      "Review matched sources before submission.",
      ["similarity"],
    ));
  }

  return {
    template: peerReview.template,
    diagnosticsChecked: peerReview.diagnostics.length,
    decision: findings.some((item) => item.severity === "blocker")
      ? "blocked"
      : findings.length > 0 ? "needs-review" : "ready",
    findings,
  };
}

function formatLooksValid(style, formatted) {
  if (style === "APA") return /\(\d{4}\)/.test(formatted) && /doi\.org\//.test(formatted);
  if (style === "Nature") return /^\d+\.\s+/.test(formatted) || /\.\s+\d{4};/.test(formatted);
  return formatted.length > 20;
}

function evaluateCitationRecommendations(citations, claims, evidenceIndex) {
  const findings = [];
  const citationByClaim = new Map(citations.map((citation) => [citation.claimId, citation]));

  for (const claim of claims) {
    requireFields(claim, ["id", "text", "citationRequired"], "claim");
    const citation = citationByClaim.get(claim.id);
    if (claim.citationRequired && !citation) {
      findings.push(finding(
        "blocker",
        "required-claim-citation-missing",
        "Required claim has no citation recommendation",
        `${claim.id} requires a citation but no recommendation was provided.`,
        "Return a citation recommendation or downgrade unsupported claim language.",
        [claim.id],
      ));
      continue;
    }

    if (!citation) continue;
    requireFields(citation, ["claimId", "sourceId", "style", "formatted", "confidence", "evidenceIds"], "citation");
    findings.push(...validateEvidenceIds(citation.evidenceIds, evidenceIndex, citation.claimId));

    const source = evidenceIndex.get(citation.sourceId);
    if (!source) {
      findings.push(finding(
        "blocker",
        "citation-source-missing",
        "Citation source is not registered",
        `${citation.claimId} references source ${citation.sourceId}, which is not in the evidence corpus.`,
        "Recommend citations from registered references.",
        [citation.claimId, citation.sourceId],
      ));
    } else if (source.sourceType === "reference" && !source.doi) {
      findings.push(finding(
        "warning",
        "citation-doi-missing",
        "External reference lacks DOI",
        `${source.id} has no DOI metadata.`,
        "Attach DOI metadata when available for reliable reference formatting.",
        [citation.claimId, source.id],
      ));
    }

    if (citation.confidence < 0.75) {
      findings.push(finding(
        "warning",
        "citation-confidence-low",
        "Citation confidence is below review threshold",
        `${citation.claimId} confidence is ${citation.confidence}.`,
        "Ask a reviewer to confirm the citation before insertion.",
        [citation.claimId],
      ));
    }

    if (!formatLooksValid(citation.style, citation.formatted)) {
      findings.push(finding(
        "warning",
        "citation-format-invalid",
        "Citation formatting does not match requested style",
        `${citation.claimId} has a ${citation.style} citation that failed deterministic formatting checks.`,
        "Regenerate the reference in the requested journal style.",
        [citation.claimId, citation.style],
      ));
    }

    const claimEvidence = new Set(claim.evidenceIds || []);
    const overlapsClaim = citation.evidenceIds.some((evidenceId) => claimEvidence.has(evidenceId));
    if (claim.evidenceIds.length > 0 && !overlapsClaim) {
      findings.push(finding(
        "blocker",
        "citation-not-linked-to-claim-evidence",
        "Citation is not linked to claim evidence",
        `${citation.claimId} recommendation does not reference any expected claim evidence span.`,
        "Tie citation recommendations to the claim's supporting manuscript or reference evidence.",
        [citation.claimId],
      ));
    }
  }

  return {
    citationCount: citations.length,
    requiredClaimCount: claims.filter((claim) => claim.citationRequired).length,
    decision: findings.some((item) => item.severity === "blocker")
      ? "blocked"
      : findings.length > 0 ? "needs-review" : "ready",
    findings,
  };
}

function buildActionQueue(reports) {
  return reports.flatMap((report) => {
    return report.findings.map((item) => ({
      severity: item.severity,
      findingId: item.id,
      title: item.title,
      remediation: item.remediation,
      targetIds: item.targetIds,
    }));
  }).sort((a, b) => {
    const rank = { blocker: 0, warning: 1, info: 2 };
    return rank[a.severity] - rank[b.severity] || a.findingId.localeCompare(b.findingId);
  });
}

function calculateReadinessScore(reports) {
  const findings = reports.flatMap((report) => report.findings);
  const penalty = findings.reduce((score, item) => {
    if (item.severity === "blocker") return score + 18;
    if (item.severity === "warning") return score + 7;
    return score + 2;
  }, 0);
  return Math.max(0, 100 - penalty);
}

function evaluateResearchToolRun(bundle, options = {}) {
  requireFields(bundle, ["manuscript", "evidenceCorpus", "claims", "toolOutputs"], "research tool bundle");
  requireFields(bundle.manuscript, ["id", "title", "domain"], "manuscript");
  requireFields(bundle.toolOutputs, ["summaries", "peerReview", "citations"], "tool outputs");

  const evidenceIndex = indexById(bundle.evidenceCorpus, "evidence");
  const summaryReports = evaluateSummaryOutputs(bundle.toolOutputs.summaries, evidenceIndex);
  const peerReviewReport = evaluatePeerReviewAid(bundle.toolOutputs.peerReview, bundle.manuscript, evidenceIndex);
  const citationReport = evaluateCitationRecommendations(bundle.toolOutputs.citations, bundle.claims, evidenceIndex);

  const reports = [...summaryReports, peerReviewReport, citationReport];
  const actionQueue = buildActionQueue(reports);
  const score = calculateReadinessScore(reports);
  const decision = actionQueue.some((item) => item.severity === "blocker")
    ? "review-required"
    : actionQueue.length > 0 ? "human-check-recommended" : "ready-for-assisted-use";
  const evaluatedAt = options.now || bundle.now || new Date().toISOString();
  const auditDigest = stableHash({
    manuscriptId: bundle.manuscript.id,
    evaluatedAt,
    decision,
    score,
    summaryReports,
    peerReviewReport,
    citationReport,
    actionQueue,
  });

  return {
    manuscriptId: bundle.manuscript.id,
    title: bundle.manuscript.title,
    evaluatedAt,
    decision,
    score,
    summaryReports,
    peerReviewReport,
    citationReport,
    actionQueue,
    auditDigest: `sha256:${auditDigest}`,
  };
}

module.exports = {
  evaluateResearchToolRun,
  stableHash,
  stableStringify,
};
