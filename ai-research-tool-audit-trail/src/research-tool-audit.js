import crypto from "node:crypto";

const SUMMARY_MODES = new Set(["abstract", "executive", "layperson"]);

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function stableStringify(value) {
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

export function evidenceHash(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16)}`;
}

export function buildPaperIntake(manuscript) {
  const sectionProfiles = manuscript.sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    wordCount: tokenize(section.text).length,
    keywords: extractKeywords(section.text, manuscript.domain),
    evidenceHash: evidenceHash({ id: section.id, text: section.text }),
  }));

  return {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    domain: manuscript.domain,
    sectionCount: manuscript.sections.length,
    sectionProfiles,
    claimCount: manuscript.claims.length,
    existingCitationCount: manuscript.existingCitations.length,
    intakeHash: evidenceHash({ sections: sectionProfiles, claims: manuscript.claims, citations: manuscript.existingCitations }),
  };
}

export function generateSummary(manuscript, mode = "abstract") {
  if (!SUMMARY_MODES.has(mode)) {
    throw new Error(`Unsupported summary mode: ${mode}`);
  }

  const evidenceSpans = selectEvidenceSpans(manuscript);
  const keyFindings = [
    "Synergy-aware features improve held-out response ranking.",
    "KRAS-mutant colon organoids are highlighted as a high-benefit subgroup.",
    "The manuscript needs stronger statistical reporting around Figure 2.",
  ];
  const implications = [
    "Combination-response features may improve translational oncology prioritization.",
    "Reviewers can reproduce the analysis if raw data, scripts, and consent details are complete.",
  ];
  const nextSteps = [
    "Add confidence intervals for the p=0.04 result.",
    "Add a detailed consent statement.",
    "Insert citation support for drug synergy and reproducible workflow claims.",
  ];

  const textByMode = {
    abstract:
      "This manuscript analyzes patient-derived organoid response maps and reports that synergy-aware features improve held-out ranking accuracy from 0.71 to 0.79. Evidence spans support the main result, but statistical intervals and consent details should be completed before submission.",
    executive:
      "The work is promising because it connects drug-combination synergy to organoid response prediction. The main result is measurable and repository-backed, but release readiness depends on confidence intervals, consent language, and missing citations for synergy metrics and reproducible workflows.",
    layperson:
      "The study tests whether measuring how drug combinations work together can better predict which lab-grown tumor samples respond to treatment. The idea looks useful, but the paper should explain the statistics and patient consent more clearly before sharing widely.",
  };

  return {
    manuscriptId: manuscript.id,
    mode,
    summary: textByMode[mode],
    keyFindings,
    implications,
    nextSteps,
    evidenceSpans,
    summaryHash: evidenceHash({ mode, evidenceSpans, keyFindings, implications, nextSteps }),
  };
}

export function alignClaimsToEvidence(manuscript) {
  return manuscript.claims.map((claim) => {
    const section = manuscript.sections.find((item) => item.id === claim.evidenceSection);
    const overlap = section ? tokenOverlap(claim.text, section.text) : 0;
    const citationCoverage = claim.requiredCitationTopics.map((topic) => ({
      topic,
      covered: manuscript.existingCitations.some((citation) => citation.topics.includes(topic)),
    }));
    const missingCitationTopics = citationCoverage.filter((item) => !item.covered).map((item) => item.topic);
    const status = !section ? "missing-evidence" : overlap < 0.2 ? "weak-evidence" : missingCitationTopics.length ? "needs-citation" : "supported";

    return {
      claimId: claim.id,
      status,
      overlapScore: Math.round(overlap * 100),
      evidenceSection: claim.evidenceSection,
      missingCitationTopics,
      evidenceHash: evidenceHash({ claim, sectionText: section?.text ?? null, citationCoverage }),
    };
  });
}

export function runPeerReviewAid(manuscript) {
  const claimAlignment = alignClaimsToEvidence(manuscript);
  const issues = [];

  const results = manuscript.sections.find((section) => section.id === "results")?.text ?? "";
  const hasPValue = /\bp\s*=\s*0\.\d+/i.test(results);
  const reportsInterval = /confidence interval|CI/i.test(results) && !/(omit|omits|omitted|without|no)\s+confidence intervals?/i.test(results);
  if (hasPValue && !reportsInterval) {
    issues.push(issue("statistics", "missing-confidence-interval", "Figure 2 reports a p-value without confidence intervals.", "high"));
  }

  const ethics = manuscript.sections.find((section) => section.id === "ethics")?.text ?? "";
  const hasConsentStatement = /consent/i.test(ethics) && !/(does not|not yet|without|missing|lacks?)\s+(include\s+)?(a\s+)?(detailed\s+)?consent statement/i.test(ethics);
  if (!hasConsentStatement) {
    issues.push(issue("compliance", "missing-consent-statement", "Ethics section mentions approval but lacks a detailed consent statement.", "high"));
  }
  if (!/data are available/i.test(ethics)) {
    issues.push(issue("compliance", "missing-data-availability", "Data availability wording should be explicit.", "medium"));
  }

  const weakClaims = claimAlignment.filter((claim) => claim.status !== "supported");
  for (const claim of weakClaims) {
    issues.push(issue("claims", `claim-${claim.status}`, `Claim ${claim.claimId} is ${claim.status}.`, claim.status === "needs-citation" ? "medium" : "high"));
  }

  const similarity = checkSimilarity(manuscript);
  if (similarity.maxSimilarity >= 70) {
    issues.push(issue("similarity", "similarity-review-needed", `Open-corpus similarity reached ${similarity.maxSimilarity}%.`, "medium"));
  }

  return {
    manuscriptId: manuscript.id,
    domain: manuscript.domain,
    issues,
    claimAlignment,
    similarity,
    releaseReadiness: issues.some((item) => item.severity === "high") ? "needs-author-revision" : "ready-for-review",
    reviewHash: evidenceHash({ issues, claimAlignment, similarity }),
  };
}

export function recommendCitations(manuscript, style = "APA") {
  const missingTopics = new Set(alignClaimsToEvidence(manuscript).flatMap((claim) => claim.missingCitationTopics));
  const recommendations = manuscript.candidateCitations
    .map((candidate) => {
      const topicMatches = candidate.topics.filter((topic) => missingTopics.has(topic));
      const titleOverlap = tokenOverlap(manuscript.title, candidate.title);
      const score = Math.min(100, topicMatches.length * 35 + Math.round(titleOverlap * 30) + (candidate.openAccess ? 10 : 0));
      return {
        id: candidate.id,
        title: candidate.title,
        doi: candidate.doi,
        score,
        matchedTopics: topicMatches,
        formatted: formatCitation(candidate, style),
        insertionPlan: topicMatches.map((topic) => ({ topic, afterClaimId: claimForTopic(manuscript, topic)?.id ?? null })),
      };
    })
    .filter((candidate) => candidate.score >= 35)
    .sort((a, b) => b.score - a.score);

  return {
    manuscriptId: manuscript.id,
    style,
    missingTopics: [...missingTopics],
    recommendations,
    citationHash: evidenceHash({ style, missingTopics: [...missingTopics], recommendations }),
  };
}

export function buildHallucinationGuardrail(manuscript) {
  const summary = generateSummary(manuscript, "executive");
  const peerReview = runPeerReviewAid(manuscript);
  const citationPlan = recommendCitations(manuscript, "Nature");
  const blockedOutputs = [];

  if (summary.evidenceSpans.length < 3) {
    blockedOutputs.push("summary-missing-evidence-spans");
  }
  if (peerReview.claimAlignment.some((claim) => claim.status === "missing-evidence" || claim.status === "weak-evidence")) {
    blockedOutputs.push("unsupported-claim-output");
  }
  if (citationPlan.recommendations.some((recommendation) => recommendation.score < 45)) {
    blockedOutputs.push("low-confidence-citation-insert");
  }

  return {
    manuscriptId: manuscript.id,
    status: blockedOutputs.length ? "needs-human-review" : "audit-ready",
    blockedOutputs,
    requiredDisclosures: [
      "Summaries are deterministic sample outputs, not live literature claims.",
      "Citation recommendations come from the provided open corpus sample.",
      "Authors must review statistical and compliance diagnostics before submission.",
    ],
    guardrailHash: evidenceHash({ blockedOutputs, summaryHash: summary.summaryHash, reviewHash: peerReview.reviewHash, citationHash: citationPlan.citationHash }),
  };
}

export function buildToolAuditPacket(manuscript) {
  const intake = buildPaperIntake(manuscript);
  const summaries = [...SUMMARY_MODES].map((mode) => generateSummary(manuscript, mode));
  const peerReview = runPeerReviewAid(manuscript);
  const citations = {
    APA: recommendCitations(manuscript, "APA"),
    MLA: recommendCitations(manuscript, "MLA"),
    Nature: recommendCitations(manuscript, "Nature"),
  };
  const guardrail = buildHallucinationGuardrail(manuscript);

  return {
    packetVersion: "ai-research-tool-audit-trail/v0.1",
    manuscriptId: manuscript.id,
    title: manuscript.title,
    intake,
    summaries,
    peerReview,
    citations,
    guardrail,
    auditHash: evidenceHash({ intake, summaries, peerReview, citations, guardrail }),
  };
}

function selectEvidenceSpans(manuscript) {
  return manuscript.sections.map((section) => ({
    sectionId: section.id,
    heading: section.heading,
    span: firstSentence(section.text),
    evidenceHash: evidenceHash({ sectionId: section.id, span: firstSentence(section.text) }),
  }));
}

function extractKeywords(text, domain) {
  const domainTerms = {
    biology: ["organoid", "synergy", "single-cell", "rna-seq", "kras", "cohort", "viability", "therapy", "response"],
    physics: ["quantum", "noise", "circuit"],
  };
  const tokens = new Set(tokenize(text));
  return (domainTerms[domain] ?? []).filter((term) => tokens.has(term.toLowerCase()));
}

function checkSimilarity(manuscript) {
  const manuscriptText = manuscript.sections.map((section) => section.text).join(" ");
  const matches = manuscript.openCorpusSnippets.map((snippet) => ({
    snippetId: snippet.id,
    source: snippet.source,
    similarity: Math.round(tokenOverlap(manuscriptText, snippet.text) * 100),
  }));

  return {
    maxSimilarity: Math.max(...matches.map((match) => match.similarity)),
    matches,
  };
}

function formatCitation(candidate, style) {
  const authorText = candidate.authors.join(", ");
  if (style === "MLA") {
    return `${authorText}. "${candidate.title}." ${candidate.year}. DOI:${candidate.doi}.`;
  }
  if (style === "Nature") {
    return `${authorText}. ${candidate.title}. (${candidate.year}). doi:${candidate.doi}`;
  }
  return `${authorText} (${candidate.year}). ${candidate.title}. https://doi.org/${candidate.doi}`;
}

function claimForTopic(manuscript, topic) {
  return manuscript.claims.find((claim) => claim.requiredCitationTopics.includes(topic));
}

function issue(category, code, message, severity) {
  return { category, code, message, severity };
}

function firstSentence(text) {
  return text.split(/(?<=\.)\s+/)[0];
}

function tokenOverlap(left, right) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const shared = [...leftTokens].filter((token) => rightTokens.has(token));
  return shared.length / Math.max(leftTokens.size, rightTokens.size);
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}
