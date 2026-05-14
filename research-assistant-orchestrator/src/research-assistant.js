const DOMAIN_TEMPLATES = Object.freeze({
  machine_learning: {
    methods: ["baseline comparison", "ablation", "data leakage"],
    citationSignals: ["benchmark", "dataset", "model card"]
  },
  computational_biology: {
    methods: ["sample stratification", "batch effect", "external validation"],
    citationSignals: ["protocol", "cohort", "assay"]
  }
});

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function generatePeerReviewPacket(project) {
  const tokens = tokenize(`${project.title} ${project.abstract} ${project.methods}`);
  const template = DOMAIN_TEMPLATES[project.domain] || DOMAIN_TEMPLATES.machine_learning;
  const missingMethodSignals = template.methods.filter(
    (signal) => !tokens.includes(signal.split(" ")[0])
  );
  const evidenceLinkedClaims = project.claims.map((claim) => ({
    id: claim.id,
    text: claim.text,
    evidenceCount: project.evidence.filter((item) => item.claimIds.includes(claim.id)).length
  }));
  const unsupportedClaims = evidenceLinkedClaims.filter((claim) => claim.evidenceCount === 0);
  const reviewScore = round(
    100 -
      missingMethodSignals.length * 9 -
      unsupportedClaims.length * 14 -
      Math.max(0, 3 - project.citations.length) * 5
  );

  return {
    projectId: project.id,
    template: project.domain,
    reviewScore,
    findings: [
      ...missingMethodSignals.map((signal) => ({
        severity: "medium",
        category: "methodology",
        message: `Consider adding detail for ${signal}.`
      })),
      ...unsupportedClaims.map((claim) => ({
        severity: "high",
        category: "claims_vs_evidence",
        message: `Claim ${claim.id} has no linked evidence item.`
      }))
    ],
    evidenceLinkedClaims
  };
}

export function buildReproducibilityRunbook(project) {
  const requiredFiles = ["README.md", "requirements.txt", "data/manifest.json"];
  const missingFiles = requiredFiles.filter((file) => !project.files.includes(file));
  const deterministicOutputs = project.results.filter((result) => result.deterministic === true);
  const confidenceScore = round(
    100 -
      missingFiles.length * 16 -
      Math.max(0, project.results.length - deterministicOutputs.length) * 18 -
      (project.environment.locked ? 0 : 12)
  );

  return {
    projectId: project.id,
    confidenceScore,
    requiredFiles,
    missingFiles,
    executionPlan: [
      "restore_environment",
      "verify_data_manifest",
      "run_primary_pipeline",
      "compare_reported_outputs",
      "record_reproducibility_attempt"
    ],
    flags: [
      ...missingFiles.map((file) => `missing:${file}`),
      ...project.results
        .filter((result) => !result.deterministic)
        .map((result) => `nondeterministic:${result.name}`),
      project.environment.locked ? null : "environment_not_locked"
    ].filter(Boolean)
  };
}

export function findResearchGaps({ project, corpus }) {
  const projectTokens = new Set(tokenize(`${project.title} ${project.abstract}`));
  const opportunities = corpus
    .map((paper) => {
      const paperTokens = new Set(tokenize(`${paper.title} ${paper.abstract}`));
      const overlap = [...projectTokens].filter((token) => paperTokens.has(token)).length;
      const unresolvedBoost = paper.unresolvedQuestions.length * 7;
      const replicationBoost = paper.replicationCount < 2 ? 12 : 0;
      const negativeResultBoost = paper.negativeResults ? 8 : 0;
      return {
        id: paper.id,
        title: paper.title,
        score: overlap + unresolvedBoost + replicationBoost + negativeResultBoost,
        reasons: [
          paper.replicationCount < 2 ? "low_replication" : null,
          paper.negativeResults ? "negative_results_available" : null,
          paper.unresolvedQuestions.length ? "unresolved_questions" : null
        ].filter(Boolean)
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3);

  return {
    projectId: project.id,
    opportunities
  };
}

export function orchestrateAssistantSuite({ project, corpus }) {
  const peerReview = generatePeerReviewPacket(project);
  const reproducibility = buildReproducibilityRunbook(project);
  const researchGaps = findResearchGaps({ project, corpus });
  const overallRiskScore = round(
    100 -
      peerReview.reviewScore * 0.35 -
      reproducibility.confidenceScore * 0.45 -
      researchGaps.opportunities[0].score * 0.2
  );

  return {
    projectId: project.id,
    peerReview,
    reproducibility,
    researchGaps,
    nextActions: [
      peerReview.findings.some((finding) => finding.severity === "high")
        ? "resolve_unsupported_claims"
        : "peer_review_ready",
      reproducibility.flags.length
        ? "complete_reproducibility_runbook"
        : "reproducibility_ready",
      "review_top_gap_opportunity"
    ],
    overallRiskScore
  };
}
