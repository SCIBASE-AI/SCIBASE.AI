const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "among",
  "and",
  "are",
  "because",
  "between",
  "from",
  "have",
  "into",
  "more",
  "over",
  "that",
  "their",
  "these",
  "this",
  "through",
  "using",
  "were",
  "with",
]);

const CITATION_LIBRARY = [
  {
    id: "open-science-availability",
    title: "Data and code availability in scientific publishing",
    authors: ["Munafò", "Nosek"],
    year: 2017,
    venue: "Nature Human Behaviour",
    tags: ["data", "code", "availability", "reproducibility"],
  },
  {
    id: "statistical-reporting",
    title: "Improving statistical reporting in biomedical research",
    authors: ["Goodman", "Altman"],
    year: 2016,
    venue: "PLOS Medicine",
    tags: ["p-value", "confidence", "interval", "statistics"],
  },
  {
    id: "research-ethics",
    title: "Ethics review and informed consent in human-subject research",
    authors: ["Resnik"],
    year: 2018,
    venue: "Accountability in Research",
    tags: ["ethics", "consent", "institutional", "participants"],
  },
  {
    id: "literature-synthesis",
    title: "Transparent literature synthesis for evidence-based decisions",
    authors: ["Page", "Moher"],
    year: 2021,
    venue: "BMJ",
    tags: ["review", "literature", "evidence", "screening"],
  },
];

export function normalizePaper(rawPaper) {
  if (!rawPaper || typeof rawPaper !== "object") {
    throw new TypeError("paper must be an object");
  }

  const sections = normalizeSections(rawPaper.sections || {});
  const bodyText = Object.values(sections).join("\n\n");
  const abstract = cleanText(rawPaper.abstract || sections.abstract || firstSentence(bodyText));

  return {
    id: rawPaper.id || slugify(rawPaper.title || "untitled-paper"),
    title: cleanText(rawPaper.title || "Untitled paper"),
    abstract,
    sections,
    fullText: cleanText([rawPaper.title, abstract, bodyText].filter(Boolean).join("\n\n")),
    metadata: rawPaper.metadata || {},
  };
}

export function summarizePaper(rawPaper, mode = "abstract") {
  const paper = normalizePaper(rawPaper);
  const findings = extractFindings(paper).slice(0, 3);
  const topicTerms = extractKeywords(paper.fullText, 5);

  const summaryText = {
    abstract: `${paper.title}: ${paper.abstract}`,
    executive: [
      `${paper.title} centers on ${topicTerms.join(", ")}.`,
      findings.length ? `Primary findings: ${findings.map((finding) => finding.claim).join(" ")}` : "Primary findings were not explicit enough for automatic extraction.",
      `Review priority: ${runPeerReviewChecks(paper).severityCounts.high} high-risk checks need attention.`,
    ].join(" "),
    layperson: `This paper studies ${topicTerms.slice(0, 3).join(", ")} and explains what changed, why it matters, and what evidence supports the claims.`,
  }[mode];

  if (!summaryText) {
    throw new RangeError(`Unsupported summary mode: ${mode}`);
  }

  return {
    mode,
    text: summaryText,
    keywords: topicTerms,
    evidenceFindingIds: findings.map((finding) => finding.id),
  };
}

export function extractFindings(rawPaper) {
  const paper = rawPaper.fullText ? rawPaper : normalizePaper(rawPaper);
  const candidateSections = ["results", "findings", "discussion", "abstract", "conclusion"];

  return candidateSections
    .flatMap((sectionName) => {
      const text = paper.sections[sectionName];
      if (!text) return [];

      return splitSentences(text)
        .filter((sentence) => /\b(increase|decrease|improve|reduce|associate|significant|outperform|correlat|found|show)\w*\b/i.test(sentence))
        .map((sentence, index) => ({
          id: `${paper.id}-${sectionName}-${index + 1}`,
          section: sectionName,
          claim: sentence,
          evidenceSpan: sentence.slice(0, 240),
          confidence: confidenceForSentence(sentence),
        }));
    })
    .slice(0, 8);
}

export function runPeerReviewChecks(rawPaper) {
  const paper = rawPaper.fullText ? rawPaper : normalizePaper(rawPaper);
  const risks = [];
  const lower = paper.fullText.toLowerCase();

  if (!/\b(data availability|available at|repository|dataset|supplementary data)\b/.test(lower)) {
    risks.push(risk("missing-data-availability", "high", "No clear data availability statement was found."));
  }

  if (!/\b(code availability|github|software|source code|analysis code)\b/.test(lower)) {
    risks.push(risk("missing-code-availability", "medium", "No clear code availability or analysis software statement was found."));
  }

  if (/\b(participant|patient|survey|human subject|clinical)\b/.test(lower) && !/\b(ethics|irb|consent|institutional review)\b/.test(lower)) {
    risks.push(risk("ethics-coverage", "high", "Human-subject language appears without an ethics or consent statement."));
  }

  if (/\bp\s*[<=>]\s*0?\.\d+|p-value|confidence interval|ci\b/i.test(paper.fullText) && !/\b(effect size|confidence interval|95%\s*ci|adjusted)\b/i.test(paper.fullText)) {
    risks.push(risk("statistical-context", "medium", "Statistical claims appear without enough effect-size or confidence-interval context."));
  }

  const vagueMatches = paper.fullText.match(/\b(novel|groundbreaking|robust|state-of-the-art|significant improvement)\b/gi) || [];
  if (vagueMatches.length >= 3) {
    risks.push(risk("unsupported-language", "low", "Several broad claims should be tied to explicit evidence or comparisons."));
  }

  return {
    risks,
    severityCounts: countSeverities(risks),
  };
}

export function recommendCitations(rawPaper, style = "apa") {
  const paper = rawPaper.fullText ? rawPaper : normalizePaper(rawPaper);
  const keywords = new Set(extractKeywords(paper.fullText, 12).map((keyword) => keyword.toLowerCase()));

  return CITATION_LIBRARY.map((candidate) => {
    const matches = candidate.tags.filter((tag) => keywords.has(tag) || paper.fullText.toLowerCase().includes(tag));
    return {
      ...candidate,
      confidence: Number(Math.min(0.95, 0.35 + matches.length * 0.18).toFixed(2)),
      matchedTerms: matches,
      reason: matches.length ? `Matches paper terms: ${matches.join(", ")}.` : "General research workflow relevance.",
      formatted: formatCitation(candidate, style),
    };
  })
    .filter((candidate) => candidate.confidence >= 0.35)
    .sort((a, b) => b.confidence - a.confidence || a.id.localeCompare(b.id));
}

export function createResearchPacket(rawPaper, options = {}) {
  const paper = normalizePaper(rawPaper);
  const summary = summarizePaper(paper, options.summaryMode || "abstract");
  const findings = extractFindings(paper);
  const peerReview = runPeerReviewChecks(paper);
  const citations = recommendCitations(paper, options.citationStyle || "apa");

  return {
    document: {
      id: paper.id,
      title: paper.title,
      sectionCount: Object.keys(paper.sections).length,
      keywords: summary.keywords,
    },
    summary,
    findings,
    peerReview,
    citations,
    workflow: {
      nextSteps: buildNextSteps(peerReview, findings, citations),
      dashboardSummary: {
        highRiskCount: peerReview.severityCounts.high,
        findingCount: findings.length,
        citationCandidateCount: citations.length,
      },
    },
  };
}

export function createBatchResearchPackets(papers, options = {}) {
  if (!Array.isArray(papers)) {
    throw new TypeError("papers must be an array");
  }

  return papers.map((paper) => createResearchPacket(paper, options));
}

function normalizeSections(sections) {
  return Object.fromEntries(
    Object.entries(sections)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => [slugify(key), cleanText(value)]),
  );
}

function buildNextSteps(peerReview, findings, citations) {
  const steps = [];
  if (peerReview.risks.length) steps.push("Resolve peer-review diagnostics before submission.");
  if (findings.length) steps.push("Check each extracted finding against its evidence span.");
  if (citations.length) steps.push("Review citation candidates and replace placeholders with corpus-backed retrieval results.");
  return steps;
}

function risk(id, severity, message) {
  return { id, severity, message };
}

function countSeverities(risks) {
  return risks.reduce(
    (counts, item) => {
      counts[item.severity] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

function formatCitation(candidate, style) {
  const authorText = candidate.authors.join(" & ");
  if (style === "nature") {
    return `${authorText}. ${candidate.title}. ${candidate.venue} (${candidate.year}).`;
  }
  if (style === "mla") {
    return `${authorText}. "${candidate.title}." ${candidate.venue}, ${candidate.year}.`;
  }
  return `${authorText} (${candidate.year}). ${candidate.title}. ${candidate.venue}.`;
}

function extractKeywords(text, limit) {
  const counts = new Map();
  for (const token of cleanText(text).toLowerCase().match(/[a-z][a-z-]{3,}/g) || []) {
    if (STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function confidenceForSentence(sentence) {
  let score = 0.45;
  if (/\b\d+(\.\d+)?%?\b/.test(sentence)) score += 0.15;
  if (/\bp\s*[<=>]\s*0?\.\d+|confidence interval|95%\s*ci\b/i.test(sentence)) score += 0.15;
  if (/\bcompared with|baseline|control|cohort\b/i.test(sentence)) score += 0.1;
  return Number(Math.min(score, 0.95).toFixed(2));
}

function splitSentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function firstSentence(text) {
  return splitSentences(text)[0] || "";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}
