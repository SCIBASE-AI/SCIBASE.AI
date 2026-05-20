"use strict"

const { evaluateChallengePosting } = require("./index")

const result = evaluateChallengePosting({
  id: "challenge-biomarker-2026",
  title: "Single-cell biomarker discovery for treatment response",
  scientificContext:
    "Sponsors have collected single-cell RNA-seq profiles across matched responder and non-responder cohorts. The posted challenge asks solvers to identify reproducible biomarker signatures while preserving patient privacy and making all model claims auditable.",
  problemStatement:
    "Build and validate a biomarker-ranking workflow that separates responder and non-responder samples, explains candidate pathways, and produces a reproducible report with evidence-linked outputs.",
  deliverables: [
    {
      id: "model",
      name: "Ranking model",
      fileFormat: "notebook + JSON",
      acceptanceEvidence: "Top-ranked markers include model score, pathway note, and holdout validation metric.",
    },
    {
      id: "report",
      name: "Scientific report",
      fileFormat: "PDF",
      acceptanceEvidence: "Report includes methods, validation, limitations, and reproducibility instructions.",
    },
  ],
  evaluationRubric: [
    {
      name: "Scientific validity",
      weight: 40,
      deliverableId: "model",
      measurement: "Holdout AUC, pathway plausibility, and leakage checks are reviewed together.",
    },
    {
      name: "Reproducibility",
      weight: 30,
      deliverableId: "report",
      measurement: "Reviewer can rerun the workflow from the submitted package.",
    },
    {
      name: "Communication",
      weight: 30,
      deliverableId: "report",
      measurement: "Findings, limitations, and sponsor next steps are understandable to domain reviewers.",
    },
  ],
  timeline: {
    openAt: "2026-06-01",
    submissionDue: "2026-07-01",
    reviewDue: "2026-07-15",
    awardDue: "2026-07-22",
  },
  prize: { amount: 5000, currency: "USD" },
  payoutMilestones: [
    { amount: 1000, trigger: "proposal shortlist" },
    { amount: 4000, trigger: "final award" },
  ],
  privateChallenge: true,
  requiresNda: true,
  ndaPlan: "Platform NDA before data-room access",
  prequalification: "Solvers submit prior bioinformatics work and privacy acknowledgement",
  sponsorContact: { role: "R&D program manager" },
  ipPolicy: { defaultLicense: "solver retains IP until paid" },
  submissionPrivacy: { visibility: "private to sponsor and reviewers" },
})

console.log("Challenge Rubric Readiness Gate Demo")
console.log("====================================")
console.log(`title: ${result.title}`)
console.log(`status: ${result.status}`)
console.log(`readiness score: ${result.readinessScore}`)
console.log(`deliverables: ${result.deliverableCount}`)
console.log(`rubric total: ${result.rubricWeightTotal}`)
console.log(`payout total: ${result.payoutTotal}`)
console.log(`top action: ${result.actions[0]}`)
console.log(`digest: ${result.auditDigest.slice(0, 16)}...`)
