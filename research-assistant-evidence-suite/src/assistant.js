const DOMAIN_TEMPLATES = {
  "molecular-biology": {
    name: "Molecular biology",
    weights: { clarity: 15, methodology: 25, citations: 15, evidence: 25, ethics: 10, data: 10 },
    requiredSections: ["methods", "results", "limitations"]
  },
  "clinical-trials": {
    name: "Clinical trials",
    weights: { clarity: 10, methodology: 30, citations: 10, evidence: 20, ethics: 20, data: 10 },
    requiredSections: ["methods", "results", "limitations", "ethics"]
  },
  computational: {
    name: "Computational research",
    weights: { clarity: 15, methodology: 20, citations: 10, evidence: 20, ethics: 5, data: 30 },
    requiredSections: ["methods", "results", "limitations"]
  }
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const hasText = (value) => typeof value === "string" && value.trim().length > 24;

const finding = (severity, category, message, evidence, action) => ({
  severity,
  category,
  message,
  evidence,
  action
});

function severityPenalty(severity) {
  return severity === "blocker" ? 22 : severity === "warning" ? 10 : 4;
}

function reviewClarity(project, template) {
  const findings = [];
  if (!hasText(project.abstract)) {
    findings.push(
      finding("warning", "clarity", "Abstract is missing or too short for reviewer triage.", "abstract", "Add a concise structured abstract.")
    );
  }
  for (const section of template.requiredSections) {
    if (!hasText(project.sections?.[section])) {
      findings.push(
        finding("blocker", "clarity", `Required ${section} section is absent or too thin.`, `sections.${section}`, `Expand the ${section} section before release.`)
      );
    }
  }
  return findings;
}

function reviewMethodology(project) {
  const methods = `${project.sections?.methods ?? ""} ${project.sections?.results ?? ""}`.toLowerCase();
  const findings = [];
  if (!/\b\d+\b/.test(methods)) {
    findings.push(
      finding("warning", "methodology", "Methods do not mention sample size or cohort count.", "sections.methods", "Report sample size and cohort composition.")
    );
  }
  if (!methods.includes("confidence interval") && !methods.includes("effect size")) {
    findings.push(
      finding("warning", "statistics", "Results lack confidence interval or effect-size reporting.", "sections.results", "Add uncertainty estimates for the primary claims.")
    );
  }
  if (!methods.includes("random")) {
    findings.push(
      finding("info", "methodology", "Randomization is not explicit.", "sections.methods", "Clarify randomization or allocation strategy.")
    );
  }
  return findings;
}

function reviewCitationCoverage(project) {
  const findings = [];
  for (const [section, count] of Object.entries(project.citationsBySection ?? {})) {
    if (section !== "methods" && count === 0) {
      findings.push(
        finding("warning", "citations", `${section} section has no citations.`, `citationsBySection.${section}`, "Add citations or explain why claims are self-contained.")
      );
    }
  }
  return findings;
}

function reviewClaimsAgainstEvidence(project) {
  const findings = [];
  for (const claim of project.claims ?? []) {
    if (claim.strength === "high" && (claim.evidenceIds ?? []).length < 3) {
      findings.push(
        finding(
          "warning",
          "claims-vs-evidence",
          "High-strength claim is supported by limited evidence links.",
          claim.text,
          "Downgrade the claim or attach additional validation evidence."
        )
      );
    }
    if (/therapeutic|clinical|cure|treatment/i.test(claim.text) && claim.strength === "high") {
      findings.push(
        finding(
          "blocker",
          "scope-alignment",
          "Clinical or therapeutic claim appears stronger than the supplied validation context.",
          claim.text,
          "Frame as a hypothesis or add clinical validation evidence."
        )
      );
    }
  }
  return findings;
}

function reviewEthicsAndData(project) {
  const text = Object.values(project.sections ?? {}).join(" ").toLowerCase();
  const findings = [];
  if (!text.includes("ethics") && !text.includes("consent") && /patient|clinical/i.test(project.abstract ?? "")) {
    findings.push(
      finding("warning", "ethics", "Patient-derived project lacks an explicit ethics or consent statement.", "abstract", "Add ethics approval and consent context.")
    );
  }
  const missingArtifacts = (project.artifacts ?? []).filter((artifact) => !artifact.present);
  for (const artifact of missingArtifacts) {
    findings.push(
      finding("warning", "data-availability", `Expected ${artifact.type} artifact is missing.`, artifact.id, "Publish the artifact or mark it as restricted with access instructions.")
    );
  }
  return findings;
}

export function buildPeerReviewReport(project) {
  const template = DOMAIN_TEMPLATES[project.domain] ?? DOMAIN_TEMPLATES.computational;
  const findings = [
    ...reviewClarity(project, template),
    ...reviewMethodology(project),
    ...reviewCitationCoverage(project),
    ...reviewClaimsAgainstEvidence(project),
    ...reviewEthicsAndData(project)
  ];
  const score = clamp(100 - findings.reduce((sum, item) => sum + severityPenalty(item.severity), 0));
  return {
    projectId: project.id,
    template: template.name,
    score,
    status: score >= 80 ? "ready" : score >= 60 ? "needs-review" : "revise-before-release",
    findings,
    suggestedActions: findings.map((item) => item.action)
  };
}

function checkArtifacts(project) {
  return (project.artifacts ?? []).map((artifact) => ({
    check: `artifact:${artifact.id}`,
    status: artifact.present ? "passed" : "warning",
    evidence: artifact.uri,
    message: artifact.present ? `${artifact.id} is available.` : `${artifact.id} is referenced but missing.`
  }));
}

function checkEnvironment(project) {
  const env = project.environment ?? {};
  return {
    check: "environment-lock",
    status: env.locked && (env.files ?? []).length > 0 ? "passed" : "warning",
    evidence: [...(env.files ?? []), ...(env.containers ?? [])],
    message: env.locked ? "Execution environment is pinned." : "Execution environment is not pinned."
  };
}

function checkRunCommands(project) {
  const commands = project.reproducibility?.commands ?? [];
  return {
    check: "run-commands",
    status: commands.length > 0 ? "passed" : "blocker",
    evidence: commands,
    message: commands.length > 0 ? "Reproduction commands are declared." : "No reproduction command is declared."
  };
}

function checkExpectedOutputs(project) {
  return (project.reproducibility?.expectedOutputs ?? []).map((output) => ({
    check: `output:${output.id}`,
    status: output.present ? "passed" : "warning",
    evidence: output.checksum,
    message: output.present ? `${output.id} output is present.` : `${output.id} output is missing.`
  }));
}

export function buildReproducibilityReport(project) {
  const checks = [
    ...checkArtifacts(project),
    checkEnvironment(project),
    checkRunCommands(project),
    ...checkExpectedOutputs(project)
  ];
  const penalty = checks.reduce((sum, check) => sum + (check.status === "blocker" ? 25 : check.status === "warning" ? 10 : 0), 0);
  const confidenceScore = clamp(100 - penalty);
  return {
    projectId: project.id,
    confidenceScore,
    status: checks.some((check) => check.status === "blocker") ? "blocked" : confidenceScore >= 80 ? "ready" : "needs-artifact-cleanup",
    checks,
    priorAttempts: project.reproducibility?.priorAttempts ?? [],
    recommendedCommand: project.reproducibility?.commands?.[0] ?? null
  };
}

function overlapScore(source, target) {
  const sourceSet = new Set(source.map((item) => item.toLowerCase()));
  return target.reduce((score, item) => score + (sourceSet.has(item.toLowerCase()) ? 1 : 0), 0);
}

function scoreGap(gap, profile) {
  const novelty = Math.max(0, 40 - gap.replicationCount * 9);
  const citationSignal = Math.min(25, Math.round(gap.citations / 5));
  const unresolvedSignal = (gap.unresolvedQuestions ?? []).length * 12;
  const negativeSignal = (gap.negativeResults ?? []).length * 8;
  const fit = overlapScore(profile.interests ?? [], gap.topics ?? []) * 7 + overlapScore(profile.labCapabilities ?? [], gap.requiredCapabilities ?? []) * 6;
  return novelty + citationSignal + unresolvedSignal + negativeSignal + fit;
}

export function findResearchGaps(project, corpus, profile) {
  return corpus
    .map((gap) => ({
      id: gap.id,
      title: gap.title,
      opportunityScore: scoreGap(gap, profile),
      matchedProjectTopics: overlapScore(project.title.split(/\W+/), gap.topics ?? []),
      unresolvedQuestions: gap.unresolvedQuestions ?? [],
      recommendedNextStep:
        gap.replicationCount <= 1
          ? "Design a replication-first study with a preregistered validation package."
          : "Build a focused benchmark or meta-analysis around the unresolved question."
    }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function buildAssistantDashboard(project, corpus, profile) {
  const review = buildPeerReviewReport(project);
  const reproducibility = buildReproducibilityReport(project);
  const gaps = findResearchGaps(project, corpus, profile);
  const readinessScore = Math.round(review.score * 0.4 + reproducibility.confidenceScore * 0.4 + Math.min(gaps[0]?.opportunityScore ?? 0, 100) * 0.2);
  return {
    project: { id: project.id, title: project.title, domain: project.domain },
    readinessScore,
    readinessStatus: readinessScore >= 80 ? "ready-for-assisted-review" : "needs-curation",
    summary: {
      peerReviewScore: review.score,
      reproducibilityConfidence: reproducibility.confidenceScore,
      topGapScore: gaps[0]?.opportunityScore ?? 0,
      blockerCount: [...review.findings, ...reproducibility.checks].filter((item) => item.severity === "blocker" || item.status === "blocker").length
    },
    review,
    reproducibility,
    researchGaps: gaps
  };
}
