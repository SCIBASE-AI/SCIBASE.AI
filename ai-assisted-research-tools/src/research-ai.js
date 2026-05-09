import { corpus, manuscript, reviewTemplates } from "./data/open-corpus.js";

const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "were",
  "was",
  "are",
  "can",
  "into",
  "when",
  "then",
  "than",
  "they",
  "their",
  "study",
  "research",
  "paper",
  "model",
  "data"
]);

export function analyzeManuscript(input = manuscript) {
  const text = flattenSections(input);
  const keywords = extractKeywords(text, 14);
  const domain = input.domain || inferDomain(keywords);
  return {
    manuscriptId: input.id,
    title: input.title,
    domain,
    wordCount: tokenize(text).length,
    keywords,
    sectionCount: input.sections.length
  };
}

export function summarizePaper(input = manuscript, mode = "executive") {
  const profile = analyzeManuscript(input);
  const sentences = splitSentences(flattenSections(input));
  const scored = sentences
    .map((sentence) => ({
      sentence,
      score: scoreSentence(sentence, profile.keywords) + sectionWeight(input, sentence)
    }))
    .sort((a, b) => b.score - a.score);
  const summarySentences = scored.slice(0, mode === "abstract" ? 3 : 4).map((item) => item.sentence);
  const keyFindings = findSentences(sentences, ["improved", "predict", "resistant", "accuracy"]).slice(0, 3);
  const implications = [
    `The work is most relevant to ${profile.domain} teams evaluating ${profile.keywords.slice(0, 3).join(", ")}.`,
    "The result is promising but should be interpreted with uncertainty until prospective replication and fuller statistical reporting are available."
  ];
  const nextSteps = [
    "Add confidence intervals and multiple-testing details for subgroup claims.",
    "Link the public code, data dictionary, and validation split directly from the manuscript.",
    "Run a prospective replication cohort before clinical deployment."
  ];

  return {
    mode,
    title: input.title,
    domain: profile.domain,
    summary:
      mode === "layperson"
        ? toLaypersonSummary(summarySentences)
        : mode === "abstract"
          ? summarySentences.join(" ")
          : `${summarySentences.join(" ")} Recommended editorial focus: clarify uncertainty, reproducibility, and clinical boundaries.`,
    keyFindings,
    implications,
    nextSteps
  };
}

export function peerReviewAid(input = manuscript, domain = input.domain || "biology") {
  const text = flattenSections(input);
  const template = reviewTemplates[domain] || reviewTemplates.biology;
  const sentences = splitSentences(text);
  const issues = [
    ...detectSimilarity(input.uploadedCorpusSnippets || [], text),
    ...detectStatisticsIssues(text),
    ...detectComplianceIssues(text, template),
    ...detectClarityIssues(sentences)
  ];
  const severityOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    template: domain,
    tone: template.tone,
    score: Math.max(0, 100 - issues.reduce((total, issue) => total + issue.penalty, 0)),
    issues,
    checklist: template.requiredStatements.map((statement) => ({
      statement,
      present: text.toLowerCase().includes(statement)
    }))
  };
}

export function recommendCitations(input = manuscript, highlightedText = input.highlightedText, style = "APA") {
  const context = `${input.title} ${highlightedText} ${flattenSections(input)}`;
  const keywords = extractKeywords(context, 18);
  const recommendations = corpus
    .filter((paper) => !input.existingReferences?.includes(paper.id))
    .map((paper) => {
      const keywordOverlap = paper.domains.filter((domain) => keywords.includes(domain) || context.toLowerCase().includes(domain)).length;
      const abstractOverlap = extractKeywords(paper.abstract, 10).filter((keyword) => keywords.includes(keyword)).length;
      const recency = Math.max(0, paper.year - 2020) / 10;
      const authority = Math.min(1, paper.citedBy / 250);
      const score = keywordOverlap * 3 + abstractOverlap * 2 + recency + authority;
      return {
        id: paper.id,
        title: paper.title,
        reason: citationReason(paper, keywords, highlightedText),
        score: Number(score.toFixed(2)),
        formatted: formatCitation(paper, style),
        insertText: `(${paper.authors[0].split(" ").at(-1)} et al., ${paper.year})`
      };
    })
    .filter((paper) => paper.score > 1)
    .sort((a, b) => b.score - a.score);

  return {
    style,
    highlightedText,
    recommendations: recommendations.slice(0, 4),
    similarPapers: recommendations.slice(0, 3).map(({ id, title, score }) => ({ id, title, score }))
  };
}

export function buildDashboard(input = manuscript) {
  return {
    profile: analyzeManuscript(input),
    summaries: {
      abstract: summarizePaper(input, "abstract"),
      executive: summarizePaper(input, "executive"),
      layperson: summarizePaper(input, "layperson")
    },
    review: peerReviewAid(input),
    citations: recommendCitations(input, input.highlightedText, "Nature")
  };
}

function flattenSections(input) {
  return input.sections.map((section) => `${section.heading}. ${section.text}`).join(" ");
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function extractKeywords(text, limit = 10) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    if (token.length < 4 || stopWords.has(token)) continue;
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function inferDomain(keywords) {
  if (keywords.some((word) => ["patient", "biology", "organoid", "tumor"].includes(word))) return "biology";
  if (keywords.some((word) => ["uncertainty", "calibration", "physics"].includes(word))) return "physics";
  return "social-science";
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);
}

function scoreSentence(sentence, keywords) {
  const lower = sentence.toLowerCase();
  return keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? 1 : 0), 0);
}

function sectionWeight(input, sentence) {
  const section = input.sections.find((item) => item.text.includes(sentence) || `${item.heading}. ${item.text}`.includes(sentence));
  if (!section) return 0;
  return { Abstract: 3, Results: 2, Discussion: 1.5, Methods: 1 }[section.heading] || 0;
}

function findSentences(sentences, needles) {
  return sentences.filter((sentence) => needles.some((needle) => sentence.toLowerCase().includes(needle)));
}

function toLaypersonSummary(sentences) {
  return sentences
    .join(" ")
    .replaceAll("Patient-derived tumor organoids", "small lab-grown versions of a patient's tumor")
    .replaceAll("chemotherapy response", "whether a cancer treatment is likely to work")
    .replaceAll("genomic biomarkers", "genetic clues")
    .replaceAll("prospective replication", "a future study that checks the result again");
}

function detectSimilarity(snippets, manuscriptText) {
  const lowered = manuscriptText.toLowerCase();
  return snippets
    .map((snippet) => {
      const terms = extractKeywords(snippet, 12);
      const overlap = terms.filter((term) => lowered.includes(term)).length / Math.max(terms.length, 1);
      return { snippet, overlap };
    })
    .filter(({ overlap }) => overlap >= 0.5)
    .map(({ snippet, overlap }) => ({
      type: "similarity",
      severity: overlap > 0.8 ? "high" : "medium",
      penalty: overlap > 0.8 ? 18 : 10,
      message: `Potential overlap with uploaded/open-corpus text (${Math.round(overlap * 100)}% keyword overlap).`,
      evidence: snippet
    }));
}

function detectStatisticsIssues(text) {
  const lowered = text.toLowerCase();
  const issues = [];
  if (/p\s*[=<]\s*0\.\d+/.test(lowered) && (!lowered.includes("confidence interval") || lowered.includes("confidence intervals were not reported"))) {
    issues.push({
      type: "statistics",
      severity: "medium",
      penalty: 12,
      message: "P-values appear without confidence intervals for the main effect.",
      evidence: "Report uncertainty alongside significance tests."
    });
  }
  if (lowered.includes("subgroup") && (!lowered.includes("multiple testing") || lowered.includes("multiple testing correction was not described"))) {
    issues.push({
      type: "statistics",
      severity: "medium",
      penalty: 12,
      message: "Subgroup claims are present without a multiple-testing correction.",
      evidence: "Add correction method or mark subgroup results exploratory."
    });
  }
  return issues;
}

function detectComplianceIssues(text, template) {
  const lowered = text.toLowerCase();
  return template.requiredStatements
    .filter((statement) => !lowered.includes(statement))
    .map((statement) => ({
      type: "compliance",
      severity: statement === "ethics" ? "high" : "medium",
      penalty: statement === "ethics" ? 20 : 10,
      message: `Missing ${statement} statement.`,
      evidence: `Required for ${template.tone} review template.`
    }));
}

function detectClarityIssues(sentences) {
  return sentences
    .filter((sentence) => sentence.split(/\s+/).length > 34)
    .map((sentence) => ({
      type: "clarity",
      severity: "low",
      penalty: 4,
      message: "Long sentence may be difficult for reviewers to parse.",
      evidence: sentence
    }));
}

function citationReason(paper, keywords, highlightedText) {
  const matches = paper.domains.filter((domain) => keywords.includes(domain) || highlightedText.toLowerCase().includes(domain));
  if (matches.length) return `Matches manuscript context for ${matches.slice(0, 3).join(", ")}.`;
  return `Supports adjacent methods and reporting context with ${paper.citedBy} citations.`;
}

function formatCitation(paper, style) {
  const authorList = paper.authors.join(", ");
  if (style === "MLA") return `${authorList}. "${paper.title}." ${paper.venue}, ${paper.year}. doi:${paper.doi}.`;
  if (style === "Nature") return `${authorList}. ${paper.title}. ${paper.venue} (${paper.year}). https://doi.org/${paper.doi}`;
  return `${authorList} (${paper.year}). ${paper.title}. ${paper.venue}. https://doi.org/${paper.doi}`;
}
