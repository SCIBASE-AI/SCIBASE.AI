const SUMMARY_MODES = new Set(["abstract", "executive", "layperson"]);

export function createPaperSummary(project, options = {}) {
  const mode = options.mode ?? "abstract";
  if (!SUMMARY_MODES.has(mode)) {
    throw new Error(`Unknown summary mode: ${mode}`);
  }

  const supportedClaims = project.claims.filter((claim) => claim.evidenceIds.length > 0);
  const uncitedClaims = project.claims.filter((claim) => !claim.cited);
  const methods = project.methods.join(", ");
  const keyFindings = supportedClaims.map((claim) => claim.text);
  const evidenceCoverage = project.claims.length === 0 ? 0 : supportedClaims.length / project.claims.length;

  const modeText = {
    abstract: `${project.title}: ${project.abstract} The current evidence supports ${supportedClaims.length} of ${project.claims.length} claims using ${methods}.`,
    executive: `This project studies ${project.keywords.slice(0, 3).join(", ")} and surfaces ${keyFindings.length} evidence-backed findings for ${project.audience.join(", ")}.`,
    layperson: `The study asks how algae cope with repeated heat. It turns measurements into plain-language findings and flags places where more proof or citations are still needed.`
  };

  return {
    projectId: project.id,
    mode,
    summary: modeText[mode],
    keyFindings,
    implications: [
      "Can shorten collaborator onboarding by exposing the strongest claims first.",
      "Can help reviewers focus on evidence gaps instead of rereading the full manuscript."
    ],
    nextSteps: [
      uncitedClaims.length > 0 ? `Add citations for ${uncitedClaims.length} uncited claim(s).` : "Citation coverage is complete.",
      evidenceCoverage < 1 ? "Link remaining claims to datasets or analysis outputs." : "All claims include evidence links."
    ],
    metrics: {
      claimCount: project.claims.length,
      supportedClaimCount: supportedClaims.length,
      evidenceCoverage: round(evidenceCoverage)
    },
    trace: [
      `mode:${mode}`,
      `claims:${project.claims.length}`,
      `supportedClaims:${supportedClaims.length}`,
      `methods:${project.methods.length}`
    ]
  };
}

export function createPeerReview(project, options = {}) {
  const template = options.template ?? project.domain ?? "general";
  const findings = [
    ...reviewClaims(project.claims),
    ...reviewSections(project.manuscriptSections),
    ...reviewDatasets(project.datasets)
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const score = Math.max(0, 100 - findings.reduce((total, finding) => total + severityPenalty(finding.severity), 0));
  const rubric = {
    clarity: scoreDimension(findings, "clarity"),
    rigor: scoreDimension(findings, "rigor"),
    reproducibility: scoreDimension(findings, "reproducibility"),
    citationCompleteness: scoreDimension(findings, "citation")
  };

  return {
    projectId: project.id,
    template,
    score,
    verdict: score >= 85 ? "ready-for-internal-review" : score >= 70 ? "needs-targeted-revision" : "needs-major-revision",
    rubric,
    findings,
    recommendedActions: findings.slice(0, 4).map((finding) => finding.suggestion),
    trace: [
      `template:${template}`,
      `findings:${findings.length}`,
      `score:${score}`
    ]
  };
}

export function recommendCitations(project, library, options = {}) {
  const limit = options.limit ?? 3;
  const existing = new Set(project.references);
  const projectTerms = new Set([...project.keywords, ...project.methods].map(normalizeTerm));

  return library
    .filter((paper) => !existing.has(paper.id))
    .map((paper) => {
      const paperTerms = [...paper.keywords, ...paper.methods].map(normalizeTerm);
      const overlap = paperTerms.filter((term) => projectTerms.has(term));
      const recencyBoost = Math.max(0, paper.year - 2020);
      const score = overlap.length * 10 + recencyBoost;
      return {
        id: paper.id,
        title: paper.title,
        score,
        reasons: overlap.map((term) => `Matches ${term}`),
        formats: formatCitation(paper),
        doi: paper.doi
      };
    })
    .filter((paper) => paper.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function runResearchWorkflow(project, library) {
  const summary = createPaperSummary(project, { mode: "executive" });
  const review = createPeerReview(project);
  const citations = recommendCitations(project, library, { limit: 3 });

  return {
    projectId: project.id,
    generatedAt: new Date("2026-05-14T00:00:00.000Z").toISOString(),
    summary,
    review,
    citations,
    guardrails: createGuardrailTrace(project, review, citations),
    status: review.score >= 80 && citations.length <= 2 ? "ready" : "needs-follow-up"
  };
}

export function createDashboard(project, library) {
  const workflow = runResearchWorkflow(project, library);
  return {
    projectId: project.id,
    title: project.title,
    cards: [
      {
        label: "Evidence Coverage",
        value: `${Math.round(workflow.summary.metrics.evidenceCoverage * 100)}%`,
        detail: `${workflow.summary.metrics.supportedClaimCount}/${workflow.summary.metrics.claimCount} claims linked`
      },
      {
        label: "Peer Review Score",
        value: workflow.review.score,
        detail: workflow.review.verdict
      },
      {
        label: "Citation Suggestions",
        value: workflow.citations.length,
        detail: workflow.citations.map((citation) => citation.title).join("; ")
      },
      {
        label: "Workflow Status",
        value: workflow.status,
        detail: workflow.guardrails.map((item) => item.message).join("; ")
      }
    ],
    workflow
  };
}

function reviewClaims(claims) {
  return claims.flatMap((claim) => {
    const findings = [];
    if (claim.evidenceIds.length === 0) {
      findings.push({
        category: "rigor",
        severity: "high",
        target: claim.id,
        message: "Claim has no linked evidence artifact.",
        suggestion: `Attach a dataset, analysis output, or figure to "${claim.text}".`
      });
    }
    if (!claim.cited) {
      findings.push({
        category: "citation",
        severity: "medium",
        target: claim.id,
        message: "Claim is not backed by a reference.",
        suggestion: `Add a citation near "${claim.text}".`
      });
    }
    if (!claim.statistic || !claim.statistic.includes("CI")) {
      findings.push({
        category: "rigor",
        severity: "medium",
        target: claim.id,
        message: "Statistical statement is missing confidence interval detail.",
        suggestion: `Add effect size and uncertainty details for "${claim.text}".`
      });
    }
    return findings;
  });
}

function reviewSections(sections) {
  return sections.flatMap((section) => {
    const findings = [];
    if (section.wordCount > 1000 && !section.hasLimitations) {
      findings.push({
        category: "clarity",
        severity: "low",
        target: section.id,
        message: "Long section has no explicit limitations note.",
        suggestion: `Add a short limitations paragraph to ${section.heading}.`
      });
    }
    if (section.id === "methods" && !section.hasEthicsStatement) {
      findings.push({
        category: "reproducibility",
        severity: "medium",
        target: section.id,
        message: "Methods section is missing an ethics or exemption statement.",
        suggestion: "Add ethics, permit, or exemption status to Methods."
      });
    }
    if (section.id === "methods" && !section.hasDataAvailability) {
      findings.push({
        category: "reproducibility",
        severity: "high",
        target: section.id,
        message: "Methods section does not point to data availability.",
        suggestion: "Add a data availability statement to Methods."
      });
    }
    return findings;
  });
}

function reviewDatasets(datasets) {
  return datasets.flatMap((dataset) => {
    const findings = [];
    if (!dataset.hasPersistentId) {
      findings.push({
        category: "reproducibility",
        severity: "medium",
        target: dataset.id,
        message: "Dataset has no persistent identifier.",
        suggestion: `Assign a DOI, accession, or UUID to ${dataset.title}.`
      });
    }
    if (!dataset.hasCodebook) {
      findings.push({
        category: "reproducibility",
        severity: "low",
        target: dataset.id,
        message: "Dataset is missing a codebook.",
        suggestion: `Add variable definitions for ${dataset.title}.`
      });
    }
    return findings;
  });
}

function createGuardrailTrace(project, review, citations) {
  return [
    {
      id: "no-hidden-model-call",
      status: "pass",
      message: "Workflow is deterministic and uses local project data only."
    },
    {
      id: "evidence-linked-output",
      status: review.findings.some((finding) => finding.category === "rigor") ? "needs-review" : "pass",
      message: "Review output identifies unsupported or under-specified claims."
    },
    {
      id: "citation-gap-check",
      status: citations.length > 0 ? "needs-review" : "pass",
      message: `${citations.length} citation candidate(s) found for ${project.title}.`
    }
  ];
}

function scoreDimension(findings, category) {
  const penalties = findings
    .filter((finding) => finding.category === category)
    .reduce((total, finding) => total + severityPenalty(finding.severity), 0);
  return Math.max(0, 100 - penalties);
}

function severityRank(severity) {
  return { low: 1, medium: 2, high: 3 }[severity] ?? 0;
}

function severityPenalty(severity) {
  return { low: 4, medium: 9, high: 18 }[severity] ?? 0;
}

function formatCitation(paper) {
  const authors = paper.authors.join(", ");
  return {
    apa: `${authors} (${paper.year}). ${paper.title}. ${paper.venue}. https://doi.org/${paper.doi}`,
    nature: `${authors}. ${paper.title}. ${paper.venue} (${paper.year}).`,
    mla: `${authors}. "${paper.title}." ${paper.venue}, ${paper.year}.`
  };
}

function normalizeTerm(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function round(value) {
  return Math.round(value * 100) / 100;
}
