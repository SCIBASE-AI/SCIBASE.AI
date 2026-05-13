const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "were",
  "while",
  "using",
  "into",
  "are",
  "was",
  "not",
  "yet",
  "but",
  "our",
  "has"
]);

export function buildToolRegistry() {
  return [
    {
      id: "paper-summarizer",
      label: "Paper Summarizer",
      inputs: ["paper.title", "paper.abstract", "paper.sections"],
      outputs: ["tldr", "sectionSummaries", "keyFindings", "limitations", "evidenceSnippets"],
      reviewStatus: "mvp-ready"
    },
    {
      id: "peer-review-aid",
      label: "Peer Review Aid",
      inputs: ["paper.sections", "paper.claims", "paper.references", "paper.artifacts"],
      outputs: ["scores", "checks", "redFlags", "actionItems"],
      reviewStatus: "mvp-ready"
    },
    {
      id: "citation-helper",
      label: "Citation Helper",
      inputs: ["paper.authors", "paper.title", "paper.venue", "paper.year", "paper.doi"],
      outputs: ["apa", "mla", "bibtex", "doi", "schemaOrg"],
      reviewStatus: "mvp-ready"
    },
    {
      id: "guardrail-evaluator",
      label: "Safety Guardrail Evaluator",
      inputs: ["paper.claims", "paper.sections", "paper.artifacts"],
      outputs: ["unsupportedClaims", "sensitiveDataFlags", "humanReviewGates"],
      reviewStatus: "mvp-ready"
    },
    {
      id: "workflow-planner",
      label: "Assisted Research Workflow Planner",
      inputs: ["paper", "researcherProfile", "toolRegistry"],
      outputs: ["orderedSteps", "artifacts", "reviewCheckpoints"],
      reviewStatus: "mvp-ready"
    }
  ];
}

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function keywords(text, limit = 8) {
  const counts = new Map();
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function firstSentence(text) {
  return sentences(text)[0] ?? text;
}

export function summarizePaper(paper) {
  const fullText = [paper.abstract, ...paper.sections.map((section) => section.text)].join(" ");
  const sectionSummaries = paper.sections.map((section) => ({
    heading: section.heading,
    summary: firstSentence(section.text),
    evidenceWeight: paper.claims.filter((claim) => claim.evidence.includes(section.heading)).length
  }));
  const keyFindings = paper.claims
    .filter((claim) => claim.evidence.length > 0 && claim.citations > 0)
    .map((claim) => ({
      claimId: claim.id,
      text: claim.text,
      evidence: claim.evidence,
      citations: claim.citations
    }));
  const limitations = paper.sections
    .filter((section) => /limitation|future|stress|small|independent/i.test(section.heading + " " + section.text))
    .map((section) => firstSentence(section.text));

  return {
    paperId: paper.id,
    title: paper.title,
    tldr: firstSentence(paper.abstract),
    sectionSummaries,
    keyFindings,
    limitations,
    keywords: keywords(fullText),
    evidenceSnippets: paper.claims.map((claim) => ({
      claimId: claim.id,
      supported: claim.evidence.length > 0 && claim.citations > 0,
      snippet: claim.evidence.length > 0 ? `Evidence sections: ${claim.evidence.join(", ")}` : "No supporting section supplied"
    }))
  };
}

export function buildPeerReviewAid(paper, options = {}) {
  const hasMethods = paper.sections.some((section) => /method/i.test(section.heading));
  const hasLimitations = paper.sections.some((section) => /limitation/i.test(section.heading));
  const artifactTypes = new Set(paper.artifacts.map((artifact) => artifact.type));
  const unsupportedClaims = paper.claims.filter((claim) => claim.evidence.length === 0 || claim.citations === 0);
  const strictness = options.strictness ?? "medium";
  const reproducibilityScore = ["dataset", "environment"].every((type) => artifactTypes.has(type)) ? 92 : 65;
  const evidenceScore = Math.max(0, 100 - unsupportedClaims.length * (strictness === "high" ? 30 : 20));

  return {
    paperId: paper.id,
    scores: {
      clarity: paper.abstract.length > 80 ? 88 : 62,
      methods: hasMethods ? 90 : 45,
      evidence: evidenceScore,
      reproducibility: reproducibilityScore,
      citationCoverage: Math.min(100, paper.references.length * 25)
    },
    checks: [
      { id: "methods-present", passed: hasMethods, message: hasMethods ? "Methods section present" : "Missing methods section" },
      { id: "limitations-present", passed: hasLimitations, message: hasLimitations ? "Limitations disclosed" : "Missing limitations" },
      { id: "artifact-package", passed: artifactTypes.has("dataset") && artifactTypes.has("environment"), message: "Dataset and environment artifacts available" },
      { id: "claim-support", passed: unsupportedClaims.length === 0, message: `${unsupportedClaims.length} unsupported claim(s)` }
    ],
    redFlags: unsupportedClaims.map((claim) => ({
      claimId: claim.id,
      reason: "Claim lacks direct evidence sections or citations",
      text: claim.text
    })),
    actionItems: [
      ...(unsupportedClaims.length ? ["Qualify or remove unsupported production-readiness claim"] : []),
      ...(hasLimitations ? [] : ["Add limitations section"]),
      "Add independent-fab replication target before broad deployment claims"
    ]
  };
}

function authorList(authors, style) {
  if (style === "mla") {
    const [first, ...rest] = authors;
    return `${first.family}, ${first.given}${rest.length ? ", et al." : ""}`;
  }
  return authors.map((author) => `${author.family}, ${author.given[0]}.`).join(", ");
}

export function formatCitation(paper, style = "apa") {
  const authors = authorList(paper.authors, style);
  if (style === "bibtex") {
    const key = `${paper.authors[0].family.toLowerCase()}${paper.year}oxide`;
    return `@article{${key},\n  title={${paper.title}},\n  author={${paper.authors.map((author) => `${author.family}, ${author.given}`).join(" and ")}},\n  journal={${paper.venue}},\n  year={${paper.year}},\n  doi={${paper.doi}}\n}`;
  }
  if (style === "mla") {
    return `${authors}. "${paper.title}." ${paper.venue}, ${paper.year}, doi:${paper.doi}.`;
  }
  return `${authors} (${paper.year}). ${paper.title}. ${paper.venue}. https://doi.org/${paper.doi}`;
}

export function buildCitationToolkit(paper, styles = ["apa", "mla", "bibtex"]) {
  const formatted = Object.fromEntries(styles.map((style) => [style, formatCitation(paper, style)]));
  return {
    paperId: paper.id,
    ...formatted,
    doi: `https://doi.org/${paper.doi}`,
    schemaOrg: {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      name: paper.title,
      datePublished: String(paper.year),
      identifier: paper.doi,
      author: paper.authors.map((author) => ({ "@type": "Person", name: `${author.given} ${author.family}` })),
      citation: paper.references.map((reference) => reference.doi)
    }
  };
}

export function evaluateGuardrails(paper) {
  const text = [paper.abstract, ...paper.sections.map((section) => section.text)].join(" ");
  const sensitiveDataFlags = [
    /patient|human subject|private|personal data/i.test(text) && "Potential human-subjects/privacy language",
    /proprietary|confidential|export controlled/i.test(text) && "Potential restricted-access language"
  ].filter(Boolean);
  const unsupportedClaims = paper.claims.filter((claim) => claim.evidence.length === 0 || claim.citations === 0);
  return {
    paperId: paper.id,
    unsupportedClaims: unsupportedClaims.map((claim) => claim.id),
    sensitiveDataFlags,
    hallucinationControls: [
      "Every generated finding includes claimId or section heading",
      "Citation output only uses supplied metadata",
      "Unsupported claims are routed to human review"
    ],
    humanReviewGates: [
      ...(unsupportedClaims.length ? ["unsupported-claims"] : []),
      ...(sensitiveDataFlags.length ? ["sensitive-data"] : []),
      "pre-publication-summary-review"
    ]
  };
}

export function planAssistedWorkflow(paper, researcherProfile, registry = buildToolRegistry()) {
  const preferredCitationStyle = researcherProfile.preferredStyles?.[0] ?? "apa";
  const orderedSteps = [
    { order: 1, toolId: "paper-summarizer", artifact: "summary.json" },
    { order: 2, toolId: "peer-review-aid", artifact: "review-aid.json" },
    { order: 3, toolId: "citation-helper", artifact: `citation-${preferredCitationStyle}.txt` },
    { order: 4, toolId: "guardrail-evaluator", artifact: "guardrails.json" }
  ].map((step) => ({
    ...step,
    label: registry.find((tool) => tool.id === step.toolId)?.label ?? step.toolId,
    reviewerCheckpoint: step.order === 2 || step.order === 4
  }));

  return {
    paperId: paper.id,
    researcher: researcherProfile.name,
    orderedSteps,
    artifacts: orderedSteps.map((step) => step.artifact),
    reviewCheckpoints: orderedSteps.filter((step) => step.reviewerCheckpoint).map((step) => step.toolId),
    runMode: "deterministic-local-mvp"
  };
}

export function buildResearchToolsDashboard(paper, researcherProfile) {
  const registry = buildToolRegistry();
  const summary = summarizePaper(paper);
  const review = buildPeerReviewAid(paper, { strictness: researcherProfile.reviewStrictness });
  const citations = buildCitationToolkit(paper, researcherProfile.preferredStyles);
  const guardrails = evaluateGuardrails(paper);
  const workflow = planAssistedWorkflow(paper, researcherProfile, registry);
  return {
    paperId: paper.id,
    registry,
    summary,
    review,
    citations,
    guardrails,
    workflow,
    readyForReviewer: review.redFlags.length <= 1 && guardrails.humanReviewGates.includes("pre-publication-summary-review")
  };
}
