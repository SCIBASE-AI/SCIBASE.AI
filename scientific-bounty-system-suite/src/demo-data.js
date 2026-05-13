export const demoChallenge = {
  id: "sci-bounty-biomarker-2026",
  title: "Identify robust biomarkers from single-cell RNA-seq cohorts",
  vertical: "biotech",
  visibility: "public",
  ndaRequired: false,
  preQualification: {
    required: true,
    criteria: ["single-cell analysis experience", "reproducible notebook sample"],
  },
  sponsor: {
    name: "Northstar Translational Research",
    type: "pharma",
    escrowStatus: "funded",
  },
  problem: {
    description:
      "Find reproducible biomarkers that distinguish therapy responders across three single-cell RNA-seq cohorts.",
    scientificContext:
      "Response signatures are noisy across donors, batches, and clinical sites. Submissions must show robust cross-cohort validation.",
    constraints: ["no patient re-identification", "containerized analysis", "all figures reproducible"],
  },
  deliverables: [
    { id: "model", title: "Working biomarker model", required: true, weight: 30 },
    { id: "notebook", title: "Reproducible analysis notebook", required: true, weight: 20 },
    { id: "dataset", title: "Derived feature matrix with dictionary", required: true, weight: 15 },
    { id: "whitepaper", title: "Scientific whitepaper", required: true, weight: 20 },
    { id: "demo", title: "Short result walkthrough", required: true, weight: 15 },
  ],
  rubric: [
    { id: "validity", title: "Scientific validity", maxScore: 35 },
    { id: "reproducibility", title: "Reproducibility", maxScore: 25 },
    { id: "novelty", title: "Novelty and research value", maxScore: 20 },
    { id: "translation", title: "Clinical translation path", maxScore: 20 },
  ],
  timeline: [
    { phase: "proposal", dueDays: 14, prizePercent: 10 },
    { phase: "prototype", dueDays: 45, prizePercent: 30 },
    { phase: "final", dueDays: 90, prizePercent: 60 },
  ],
  prize: {
    currency: "USD",
    total: 75000,
    honorableMentionPool: 5000,
    payoutSchedule: "milestone",
  },
  ipPolicy: "sponsored-transfer",
};

export const demoSubmission = {
  id: "submission-lab-aurora",
  challengeId: "sci-bounty-biomarker-2026",
  participationMode: "anonymous",
  currentPhase: "final",
  team: [
    { id: "solver-1", role: "principal investigator", payoutShare: 45, institution: "Aurora Lab" },
    { id: "solver-2", role: "computational biologist", payoutShare: 35, institution: "Independent" },
    { id: "solver-3", role: "research engineer", payoutShare: 20, institution: "Independent" },
  ],
  workspace: {
    visibility: "private-to-sponsor-and-reviewers",
    dataRoom: "restricted-derived-data",
    versionControl: true,
    reproducibilityRunner: "containerized-notebook-runner",
  },
  artifacts: [
    { id: "model", type: "model", version: "1.0.2", checksum: "sha256-model", complete: true },
    { id: "notebook", type: "notebook", version: "1.0.2", checksum: "sha256-notebook", complete: true },
    { id: "dataset", type: "dataset", version: "1.0.0", checksum: "sha256-dataset", complete: true },
    { id: "whitepaper", type: "whitepaper", version: "1.0.1", checksum: "sha256-paper", complete: true },
    { id: "demo", type: "demo", version: "1.0.0", checksum: "sha256-demo", complete: true },
  ],
  auditLog: [
    { at: "2026-05-01T09:00:00Z", actor: "solver-2", action: "uploaded derived matrix" },
    { at: "2026-05-03T13:30:00Z", actor: "solver-3", action: "reran reproducibility notebook" },
    { at: "2026-05-05T16:20:00Z", actor: "solver-1", action: "submitted final package" },
  ],
  reviewerScores: [
    { reviewer: "peer-validator-a", rubricId: "validity", score: 31 },
    { reviewer: "peer-validator-a", rubricId: "reproducibility", score: 24 },
    { reviewer: "peer-validator-b", rubricId: "novelty", score: 17 },
    { reviewer: "peer-validator-b", rubricId: "translation", score: 18 },
  ],
  feedback: [
    { severity: "info", message: "Whitepaper explains cross-cohort drift mitigation." },
    { severity: "warning", message: "Sponsor should request one external validation cohort before IP transfer." },
  ],
};
