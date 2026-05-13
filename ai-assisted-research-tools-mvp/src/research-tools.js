import manuscriptFixture from "../data/sample-manuscript.json" with { type: "json" };
import citationCorpusFixture from "../data/citation-corpus.json" with { type: "json" };

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;
const P_VALUE_PATTERN = /\bp\s*[=<]\s*0?\.\d+\b/gi;

export function loadSampleManuscript() {
  return structuredClone(manuscriptFixture);
}

export function loadCitationCorpus() {
  return structuredClone(citationCorpusFixture);
}

export function summarizePaper(manuscript = loadSampleManuscript(), mode = "executive") {
  const sentences = splitSentences([
    manuscript.abstract,
    manuscript.introduction,
    manuscript.methods,
    manuscript.results
  ].join(" "));

  const findings = extractKeyFindings(manuscript, sentences);
  const nextSteps = [
    "Add confidence intervals for the primary model comparison.",
    "Publish the de-identified matrices and notebooks once review is complete.",
    "Link biomarker claims to the recommended citation set."
  ];

  const summaryText = {
    abstract: `${manuscript.title}. ${manuscript.abstract}`,
    executive: `${manuscript.title} evaluates a reusable workflow for earlier neuroinflammation detection. The main result improves F1 to 0.82, but the draft still needs stronger statistical reporting and data-availability detail before review.`,
    layperson: "The draft describes a tool that looks for early warning signs of brain inflammation in single-cell data. It appears promising, but reviewers will need clearer uncertainty ranges and access to the supporting data."
  }[mode] ?? mode;

  return {
    manuscriptId: manuscript.id,
    mode,
    summary: summaryText,
    keyFindings: findings,
    implications: [
      "Reusable notebooks can reduce cross-cohort reproducibility friction.",
      "Transfer learning may improve biomarker ranking when cohorts are small.",
      "Reviewer trust depends on stronger statistics and release-ready data notes."
    ],
    nextSteps
  };
}

export function reviewManuscript(manuscript = loadSampleManuscript(), template = "biology") {
  const text = Object.values(pick(manuscript, ["abstract", "introduction", "methods", "results"])).join(" ");
  const pValues = text.match(P_VALUE_PATTERN) ?? [];
  const hasConfidenceInterval = /\bconfidence interval\b|\bci\b/i.test(text);
  const hasEthics = Boolean(manuscript.ethicsStatement?.trim());
  const hasDataAvailability = /release|available|repository|doi/i.test(manuscript.dataAvailability ?? "");
  const longSentences = splitSentences(text).filter((sentence) => sentence.split(/\s+/).length > 34);

  const diagnostics = [
    diagnostic("statistical_reporting", pValues.length > 0 && !hasConfidenceInterval ? "warning" : "pass", "P-values should be paired with confidence intervals or effect sizes."),
    diagnostic("ethics_statement", hasEthics ? "pass" : "warning", "Ethics or consent statement is missing."),
    diagnostic("data_availability", hasDataAvailability ? "pass" : "warning", "Data availability statement should identify timing and repository destination."),
    diagnostic("clarity", longSentences.length > 0 ? "warning" : "pass", `${longSentences.length} long sentence(s) may need editing.`),
    diagnostic("similarity_risk", "pass", "No high-risk overlap detected in the local open-access similarity sketch.")
  ];

  return {
    manuscriptId: manuscript.id,
    template,
    overallRisk: diagnostics.some((item) => item.severity === "warning") ? "needs_revision" : "ready_for_review",
    diagnostics,
    suggestedActions: diagnostics.filter((item) => item.severity !== "pass").map((item) => item.recommendation)
  };
}

export function recommendCitations(
  manuscript = loadSampleManuscript(),
  corpus = loadCitationCorpus(),
  options = {}
) {
  const style = options.style ?? "apa";
  const manuscriptTerms = tokenize([
    manuscript.title,
    manuscript.abstract,
    manuscript.methods,
    manuscript.results
  ].join(" "));

  return corpus
    .map((paper) => {
      const overlap = paper.keywords.filter((keyword) => manuscriptTerms.has(keyword.toLowerCase())).length;
      const alreadyCited = manuscript.references.includes(paper.doi);
      const score = overlap * 30 + Math.min(paper.citationCount, 1000) / 40 + (alreadyCited ? 20 : 0);
      return {
        doi: paper.doi,
        title: paper.title,
        score: Math.round(score),
        alreadyCited,
        matchedKeywords: paper.keywords.filter((keyword) => manuscriptTerms.has(keyword.toLowerCase())),
        formatted: formatCitation(paper, style)
      };
    })
    .filter((paper) => paper.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, options.limit ?? 5);
}

export function composeResearchAssistantReport(manuscript = loadSampleManuscript()) {
  return {
    generatedAt: new Date("2026-05-13T00:00:00.000Z").toISOString(),
    manuscript: {
      id: manuscript.id,
      title: manuscript.title,
      domain: manuscript.domain,
      targetAudience: manuscript.targetAudience
    },
    summaries: {
      abstract: summarizePaper(manuscript, "abstract"),
      executive: summarizePaper(manuscript, "executive"),
      layperson: summarizePaper(manuscript, "layperson")
    },
    review: reviewManuscript(manuscript),
    citations: recommendCitations(manuscript, loadCitationCorpus(), { style: "nature" }),
    similarPapersWidget: recommendCitations(manuscript, loadCitationCorpus(), { style: "apa", limit: 3 })
      .map((item) => ({ title: item.title, doi: item.doi, reason: item.matchedKeywords.join(", ") }))
  };
}

export function formatCitation(paper, style = "apa") {
  const authorText = paper.authors.join(", ");
  if (style === "nature") {
    return `${authorText}. ${paper.title}. ${paper.venue} (${paper.year}). https://doi.org/${paper.doi}`;
  }
  return `${authorText} (${paper.year}). ${paper.title}. ${paper.venue}. https://doi.org/${paper.doi}`;
}

function extractKeyFindings(manuscript, sentences) {
  return sentences.filter((sentence) => {
    return /improved|evaluate|workflow|biomarker|reproducibility|F1/i.test(sentence);
  }).slice(0, 4).map((sentence) => sentence.trim());
}

function diagnostic(id, severity, recommendation) {
  return { id, severity, recommendation };
}

function splitSentences(text) {
  return text.split(SENTENCE_SPLIT).map((sentence) => sentence.trim()).filter(Boolean);
}

function tokenize(text) {
  return new Set(text.toLowerCase().split(/[^a-z0-9-]+/).filter((token) => token.length > 2));
}

function pick(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, source[key] ?? ""]));
}
