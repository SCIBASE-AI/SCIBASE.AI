"use strict";

const crypto = require("crypto");

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "we",
  "with",
]);

const SEVERITY_WEIGHT = {
  critical: 26,
  high: 17,
  medium: 10,
  low: 5,
};

const CERTAINTY_PATTERN = /\b(proves?|guarantees?|eliminates?|no adverse events|breakthrough|definitive|conclusive|ready for national deployment)\b/i;
const NUMERIC_PATTERN = /(\d+(\.\d+)?\s?%|\bn\s?=\s?\d+|\bp\s?[<=>]\s?0?\.\d+|\b\d+(\.\d+)?\s?(fold|times|points)\b)/i;

function tokenize(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 2 && !STOP_WORDS.has(token)) || []
  );
}

function overlapRatio(leftText, rightTerms) {
  const left = tokenize(leftText);
  const right = new Set(
    Array.isArray(rightTerms)
      ? rightTerms.flatMap((term) => [...tokenize(term)])
      : [...tokenize(rightTerms)]
  );
  if (left.size === 0 || right.size === 0) return 0;

  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.min(left.size, right.size);
}

function normalizeSources(sources) {
  return new Map((sources || []).map((source) => [source.id, source]));
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || "medium",
    sourceId: finding.sourceId || null,
    evidence: finding.evidence || null,
    recommendation: finding.recommendation || defaultRecommendation(finding.code),
    ...finding,
  });
}

function defaultRecommendation(code) {
  const recommendations = {
    MISSING_CITATION: "Attach a peer-reviewed source or downgrade the claim.",
    NUMERIC_VALUE_UNGROUNDED: "Trace the statistic to a cited table, registry, or reproducible artifact.",
    CONTRADICTED_CLAIM: "Revise the manuscript claim to match the cited evidence direction.",
    LOW_RELEVANCE_CITATION: "Replace or supplement this citation with a directly matched source.",
    NON_PEER_REVIEWED_FOUNDATION: "Use peer-reviewed support for central scientific claims.",
    OVERSTATED_CERTAINTY: "Add uncertainty language and separate hypothesis from demonstrated result.",
    RETRACTED_OR_INACCESSIBLE_SOURCE: "Remove the source or document an accessible replacement.",
    STALE_CORE_EVIDENCE: "Check whether newer evidence changes the claim.",
    SINGLE_LAB_EVIDENCE_CLUSTER: "Add independent replication before presenting the finding as settled.",
    MISSING_LIMITATIONS_CAVEAT: "Add a limitations caveat near the claim and in the conclusion.",
  };
  return recommendations[code] || "Route this item for author review.";
}

function reviewClaim(claim, sourceIndex, currentYear) {
  const citedSources = (claim.citations || []).map((id) => sourceIndex.get(id)).filter(Boolean);
  const findings = [];
  const review = {
    claimId: claim.id,
    section: claim.section,
    text: claim.text,
    citationCount: citedSources.length,
    supportedBy: [],
    contradictedBy: [],
    weakMatches: [],
    missingCitations: false,
  };

  if (citedSources.length === 0) {
    review.missingCitations = true;
    addFinding(findings, {
      code: "MISSING_CITATION",
      claimId: claim.id,
      severity: claim.importance === "primary" || claim.importance === "safety" ? "critical" : "high",
      message: `Claim ${claim.id} has no citations.`,
      evidence: claim.text,
    });
    if (NUMERIC_PATTERN.test(claim.text)) {
      addFinding(findings, {
        code: "NUMERIC_VALUE_UNGROUNDED",
        claimId: claim.id,
        severity: "high",
        message: `Claim ${claim.id} includes a numeric result without a source.`,
        evidence: claim.text,
      });
    }
    return { review, findings };
  }

  const citedLabs = new Map();
  let newestYear = 0;
  let hasPeerReviewedSupport = false;
  let directlySupported = false;

  for (const source of citedSources) {
    newestYear = Math.max(newestYear, source.year || 0);
    citedLabs.set(source.lab || source.publisher || "unknown", (citedLabs.get(source.lab || source.publisher || "unknown") || 0) + 1);

    const relevance = overlapRatio(claim.text, [
      source.title,
      source.abstract,
      ...(source.topics || []),
      source.population || "",
      source.outcome || "",
    ]);
    const supports = (source.supportsClaimIds || []).includes(claim.id);
    const contradicts = (source.contradictsClaimIds || []).includes(claim.id);

    if (supports) {
      directlySupported = true;
      review.supportedBy.push(source.id);
      if (source.peerReviewed) hasPeerReviewedSupport = true;
    }
    if (contradicts) {
      review.contradictedBy.push(source.id);
      addFinding(findings, {
        code: "CONTRADICTED_CLAIM",
        claimId: claim.id,
        sourceId: source.id,
        severity: "critical",
        message: `Claim ${claim.id} conflicts with ${source.id}.`,
        evidence: source.conclusion,
      });
    }
    if (relevance < 0.2 && !supports) {
      review.weakMatches.push({ sourceId: source.id, relevance: Number(relevance.toFixed(2)) });
      addFinding(findings, {
        code: "LOW_RELEVANCE_CITATION",
        claimId: claim.id,
        sourceId: source.id,
        severity: "medium",
        message: `Citation ${source.id} is weakly matched to claim ${claim.id}.`,
        evidence: `keyword overlap ${relevance.toFixed(2)}`,
      });
    }
    if (!source.peerReviewed && (claim.importance === "primary" || claim.importance === "safety")) {
      addFinding(findings, {
        code: "NON_PEER_REVIEWED_FOUNDATION",
        claimId: claim.id,
        sourceId: source.id,
        severity: "high",
        message: `Central claim ${claim.id} relies on non-peer-reviewed source ${source.id}.`,
        evidence: `${source.type || "source"} from ${source.year || "unknown year"}`,
      });
    }
    if (source.retracted || source.access === "unavailable") {
      addFinding(findings, {
        code: "RETRACTED_OR_INACCESSIBLE_SOURCE",
        claimId: claim.id,
        sourceId: source.id,
        severity: source.retracted ? "critical" : "high",
        message: `Source ${source.id} is ${source.retracted ? "retracted" : "not accessible"}.`,
        evidence: source.title,
      });
    }
  }

  if (!directlySupported && claim.importance !== "background") {
    addFinding(findings, {
      code: "MISSING_CITATION",
      claimId: claim.id,
      severity: "high",
      message: `No cited source directly supports claim ${claim.id}.`,
      evidence: claim.text,
    });
  }
  if (CERTAINTY_PATTERN.test(claim.text) && (!hasPeerReviewedSupport || review.contradictedBy.length > 0 || claim.requiresCaveat)) {
    addFinding(findings, {
      code: "OVERSTATED_CERTAINTY",
      claimId: claim.id,
      severity: "high",
      message: `Claim ${claim.id} uses certainty language not justified by the evidence set.`,
      evidence: claim.text,
    });
  }
  if (claim.importance === "primary" && newestYear > 0 && currentYear - newestYear > 6) {
    addFinding(findings, {
      code: "STALE_CORE_EVIDENCE",
      claimId: claim.id,
      severity: "medium",
      message: `Claim ${claim.id} has no cited evidence newer than ${newestYear}.`,
      evidence: `currentYear=${currentYear}`,
    });
  }
  if (claim.importance === "primary" && citedSources.length >= 2 && citedLabs.size === 1) {
    addFinding(findings, {
      code: "SINGLE_LAB_EVIDENCE_CLUSTER",
      claimId: claim.id,
      severity: "medium",
      message: `Claim ${claim.id} depends on one lab or publisher cluster.`,
      evidence: [...citedLabs.keys()].join(", "),
    });
  }
  if (claim.requiresCaveat && !String(claim.localCaveat || "").trim()) {
    addFinding(findings, {
      code: "MISSING_LIMITATIONS_CAVEAT",
      claimId: claim.id,
      severity: "medium",
      message: `Claim ${claim.id} requires a limitations caveat near the assertion.`,
      evidence: claim.text,
    });
  }

  return { review, findings };
}

function analyzeManuscript(manuscript, options = {}) {
  const currentYear = options.currentYear || new Date().getFullYear();
  const sourceIndex = normalizeSources(manuscript.sources);
  const findings = [];
  const claimReviews = [];

  for (const claim of manuscript.claims || []) {
    const result = reviewClaim(claim, sourceIndex, currentYear);
    claimReviews.push(result.review);
    findings.push(...result.findings);
  }

  if (!/limitation|uncertain|future work|needs replication/i.test(manuscript.conclusion || "")) {
    addFinding(findings, {
      code: "MISSING_LIMITATIONS_CAVEAT",
      claimId: "conclusion",
      severity: "medium",
      message: "Conclusion does not carry forward citation and uncertainty limitations.",
      evidence: manuscript.conclusion || "",
    });
  }

  const riskScore = Math.min(
    100,
    findings.reduce((score, finding) => score + SEVERITY_WEIGHT[finding.severity], 0)
  );
  const decision =
    riskScore >= 70
      ? "revise-before-submission"
      : riskScore >= 40
        ? "needs-targeted-citation-repair"
        : "citation-ready";

  const digestPayload = findings
    .map((finding) => [finding.code, finding.claimId, finding.sourceId, finding.severity])
    .sort();
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify(digestPayload))
    .digest("hex")
    .slice(0, 16);

  return {
    manuscript: {
      id: manuscript.id,
      title: manuscript.title,
      domain: manuscript.domain,
    },
    summary: {
      decision,
      riskScore,
      auditDigest,
      claimsReviewed: (manuscript.claims || []).length,
      sourcesReviewed: (manuscript.sources || []).length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
      unsupportedOrContradictedClaims: claimReviews.filter(
        (review) => review.missingCitations || review.contradictedBy.length > 0 || review.supportedBy.length === 0
      ).length,
    },
    claimReviews,
    findings,
    reviewerChecklist: buildChecklist(findings),
  };
}

function buildChecklist(findings) {
  const byCode = new Set(findings.map((finding) => finding.code));
  return [
    {
      item: "Resolve missing and indirect citation support before submission.",
      required: byCode.has("MISSING_CITATION"),
    },
    {
      item: "Downgrade certainty where evidence is preliminary or contradicted.",
      required: byCode.has("OVERSTATED_CERTAINTY") || byCode.has("CONTRADICTED_CLAIM"),
    },
    {
      item: "Replace non-peer-reviewed support for primary or safety claims.",
      required: byCode.has("NON_PEER_REVIEWED_FOUNDATION"),
    },
    {
      item: "Carry limitations language into the conclusion and local claim context.",
      required: byCode.has("MISSING_LIMITATIONS_CAVEAT"),
    },
  ];
}

function renderMarkdownReview(report) {
  const lines = [
    `# Citation Grounding Review: ${report.manuscript.title}`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Risk score: ${report.summary.riskScore}`,
    `- Claims reviewed: ${report.summary.claimsReviewed}`,
    `- Sources reviewed: ${report.summary.sourcesReviewed}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(
      `- [${finding.severity}] ${finding.code} (${finding.claimId}${finding.sourceId ? ` via ${finding.sourceId}` : ""})`,
      `  - ${finding.message}`,
      `  - Recommendation: ${finding.recommendation}`
    );
  }

  lines.push("", "## Reviewer Checklist", "");
  for (const item of report.reviewerChecklist) {
    lines.push(`- [${item.required ? "!" : " "}] ${item.item}`);
  }
  return `${lines.join("\n")}\n`;
}

module.exports = {
  analyzeManuscript,
  renderMarkdownReview,
  tokenize,
  overlapRatio,
};
