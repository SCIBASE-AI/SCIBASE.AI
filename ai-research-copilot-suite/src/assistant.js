import { demoProject, seedCorpus } from "./demo-data.js";

const DOMAIN_TEMPLATES = {
  molecular_biology: {
    requiredArtifacts: ["dataset", "notebook", "environment"],
    reviewFocus: ["replicates", "batch effects", "raw data", "claims-versus-evidence"],
  },
  clinical_trials: {
    requiredArtifacts: ["protocol", "dataset", "environment"],
    reviewFocus: ["registration", "consent", "statistical power", "adverse events"],
  },
  computational_science: {
    requiredArtifacts: ["code", "dataset", "environment"],
    reviewFocus: ["benchmarks", "baselines", "determinism", "hardware disclosure"],
  },
};

function scoreFromFindings(findings) {
  const penalty = findings.reduce((total, finding) => {
    if (finding.severity === "blocker") return total + 25;
    if (finding.severity === "warning") return total + 12;
    return total + 4;
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

function finding(id, severity, area, message, recommendation, evidence = []) {
  return { id, severity, area, message, recommendation, evidence };
}

export function buildPeerReviewReport(project = demoProject) {
  const template = DOMAIN_TEMPLATES[project.domain] ?? DOMAIN_TEMPLATES.computational_science;
  const findings = [];

  const emptyCitationSections = project.manuscriptSections.filter(
    (section) => section.citations.length === 0,
  );
  if (emptyCitationSections.length > 0) {
    findings.push(
      finding(
        "missing-citations",
        "warning",
        "citation coverage",
        `${emptyCitationSections.map((section) => section.name).join(", ")} has no citations.`,
        "Add citations for core claims or mark the section as original analysis.",
        emptyCitationSections.map((section) => section.name),
      ),
    );
  }

  for (const claim of project.claims) {
    if (claim.evidenceIds.length < 2) {
      findings.push(
        finding(
          `thin-evidence-${claim.evidenceIds[0] ?? "none"}`,
          "warning",
          "claims versus evidence",
          `Claim has limited linked evidence: ${claim.text}`,
          "Link at least two independent artifacts or narrow the claim wording.",
          claim.evidenceIds,
        ),
      );
    }
    if (/sufficient|causal|therapeutic/i.test(claim.text) && claim.evidenceIds.length < 2) {
      findings.push(
        finding(
          "overstated-translational-claim",
          "blocker",
          "scope alignment",
          "Therapeutic or causal language is stronger than the linked evidence.",
          "Reframe as a candidate hypothesis or add orthogonal validation evidence.",
          claim.evidenceIds,
        ),
      );
    }
  }

  const methods = project.manuscriptSections.find((section) => section.name === "Methods");
  if (!methods || !/donor|replicate|batch|seed|sample/i.test(methods.text)) {
    findings.push(
      finding(
        "methods-detail-gap",
        "warning",
        "methods",
        "Methods do not clearly describe donor, replicate, batch, seed, or sample handling.",
        "Add a reproducibility paragraph covering sample counts, randomization, and batch correction.",
      ),
    );
  }

  if (!project.ethics?.dataUseStatement) {
    findings.push(
      finding(
        "missing-data-use",
        "blocker",
        "ethics",
        "No data-use statement is attached to the project.",
        "Add data-use terms before public release.",
      ),
    );
  }

  return {
    projectId: project.id,
    title: project.title,
    domain: project.domain,
    template,
    score: scoreFromFindings(findings),
    summary:
      findings.length === 0
        ? "No blocking review issues detected."
        : `${findings.length} review findings require author attention.`,
    findings,
  };
}

export function buildReproducibilityCheck(project = demoProject) {
  const template = DOMAIN_TEMPLATES[project.domain] ?? DOMAIN_TEMPLATES.computational_science;
  const artifactTypes = new Set(project.artifacts.map((artifact) => artifact.type));
  const findings = [];

  for (const requiredType of template.requiredArtifacts) {
    if (!artifactTypes.has(requiredType)) {
      findings.push(
        finding(
          `missing-${requiredType}`,
          "blocker",
          "artifact manifest",
          `Required ${requiredType} artifact is missing.`,
          `Add a ${requiredType} artifact to the project manifest.`,
        ),
      );
    }
  }

  const datasets = project.artifacts.filter((artifact) => artifact.type === "dataset");
  for (const dataset of datasets) {
    if (!dataset.hasChecksum) {
      findings.push(
        finding(
          `dataset-checksum-${dataset.id}`,
          "warning",
          "data integrity",
          `${dataset.title} has no checksum.`,
          "Add a SHA-256 checksum to support reproducible downloads.",
          [dataset.id],
        ),
      );
    }
    if (!dataset.hasLicense) {
      findings.push(
        finding(
          `dataset-license-${dataset.id}`,
          "warning",
          "data reuse",
          `${dataset.title} has no license metadata.`,
          "Attach a clear reuse license or access restriction.",
          [dataset.id],
        ),
      );
    }
  }

  const notebooks = project.artifacts.filter((artifact) => artifact.type === "notebook");
  for (const notebook of notebooks) {
    if (!notebook.executable || notebook.deterministicSeed == null) {
      findings.push(
        finding(
          `notebook-determinism-${notebook.id}`,
          "blocker",
          "execution",
          `${notebook.title} is not fully deterministic.`,
          "Declare deterministic seeds and make the notebook executable in the sandbox.",
          [notebook.id],
        ),
      );
    }
    if (!notebook.expectedOutputs?.length) {
      findings.push(
        finding(
          `notebook-outputs-${notebook.id}`,
          "warning",
          "output validation",
          `${notebook.title} has no expected output manifest.`,
          "List expected tables, figures, and hashes for output comparison.",
          [notebook.id],
        ),
      );
    }
  }

  const environment = project.artifacts.find((artifact) => artifact.type === "environment");
  if (!environment?.pinnedDependencies || !environment?.containerImage) {
    findings.push(
      finding(
        "environment-not-pinned",
        "blocker",
        "environment",
        "Execution environment is not pinned to dependencies and an image digest.",
        "Add a pinned lockfile and container image digest.",
      ),
    );
  }

  const confidence = scoreFromFindings(findings);
  return {
    projectId: project.id,
    confidence,
    status: confidence >= 80 ? "ready" : confidence >= 60 ? "needs-review" : "blocked",
    findings,
    previousAttempts: project.reproducibilityAttempts,
    sandboxPlan: {
      runner: "containerized-notebook-runner",
      maxRuntimeMinutes: 30,
      compareOutputs: true,
      captureProvenance: true,
    },
  };
}

export function findResearchGaps(project = demoProject, corpus = seedCorpus) {
  const interests = new Set(project.researcherProfile.interests.map((item) => item.toLowerCase()));
  const capabilities = new Set(
    project.researcherProfile.labCapabilities.map((item) => item.toLowerCase()),
  );

  const opportunities = corpus.map((entry) => {
    const conceptOverlap = entry.concepts.filter((concept) =>
      interests.has(concept.toLowerCase()),
    ).length;
    const capabilityOverlap = entry.concepts.filter((concept) =>
      [...capabilities].some((capability) => capability.includes(concept.toLowerCase())),
    ).length;
    const replicationGap = Math.max(0, 3 - entry.replicationCount);
    const unresolvedWeight = entry.unresolvedQuestions.length * 10;
    const negativeResultWeight = entry.negativeResults.length * 8;
    const score =
      conceptOverlap * 24 +
      capabilityOverlap * 12 +
      replicationGap * 15 +
      Math.min(30, entry.citationCount / 8) +
      unresolvedWeight +
      negativeResultWeight;

    return {
      id: entry.id,
      title: entry.title,
      score: Math.round(score),
      concepts: entry.concepts,
      signals: {
        conceptOverlap,
        capabilityOverlap,
        replicationGap,
        unresolvedQuestions: entry.unresolvedQuestions.length,
        negativeResults: entry.negativeResults.length,
        citationCount: entry.citationCount,
      },
      recommendedNextStep:
        replicationGap > 1
          ? "Design a replication-first study using the lab's existing organoid and single-cell capabilities."
          : "Use this as a literature-review and grant-ideation seed.",
      unresolvedQuestions: entry.unresolvedQuestions,
    };
  });

  opportunities.sort((a, b) => b.score - a.score);
  return {
    projectId: project.id,
    profile: project.researcherProfile,
    opportunities,
  };
}

export function buildDashboard(project = demoProject) {
  return {
    generatedAt: new Date("2026-05-13T00:00:00.000Z").toISOString(),
    project: {
      id: project.id,
      title: project.title,
      domain: project.domain,
      artifactCount: project.artifacts.length,
      claimCount: project.claims.length,
    },
    peerReview: buildPeerReviewReport(project),
    reproducibility: buildReproducibilityCheck(project),
    researchGaps: findResearchGaps(project),
  };
}
