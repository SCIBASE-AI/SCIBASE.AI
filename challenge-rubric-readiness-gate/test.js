"use strict"

const assert = require("node:assert/strict")
const { evaluateChallengePosting } = require("./index")

const readyChallenge = {
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
      acceptanceEvidence: "Top-ranked markers must include model score, pathway note, and holdout validation metric.",
    },
    {
      id: "report",
      name: "Scientific report",
      fileFormat: "PDF",
      acceptanceEvidence: "Report must include methods, validation, limitations, and reproducibility instructions.",
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
}

{
  const result = evaluateChallengePosting(readyChallenge)
  assert.equal(result.status, "ready")
  assert.equal(result.rubricWeightTotal, 100)
  assert.equal(result.payoutTotal, 5000)
  assert.equal(result.deliverableCount, 2)
  assert.match(result.auditDigest, /^[0-9a-f]{64}$/)
}

{
  const result = evaluateChallengePosting({
    ...readyChallenge,
    evaluationRubric: readyChallenge.evaluationRubric.map((criterion) => ({
      ...criterion,
      weight: criterion.name === "Communication" ? 10 : criterion.weight,
    })),
    payoutMilestones: [{ amount: 2500, trigger: "final award" }],
  })

  assert.equal(result.status, "blocked")
  assert.ok(result.blockers.includes("evaluation rubric weights must total 100, got 80"))
  assert.ok(result.blockers.includes("payout milestones must total prize amount 5000, got 2500"))
}

{
  const result = evaluateChallengePosting({
    ...readyChallenge,
    deliverables: [
      {
        id: "model",
        name: "Ranking model",
        fileFormat: "notebook",
        acceptanceEvidence: "Ranking output is present.",
      },
      {
        id: "model",
        name: "Duplicate model",
        fileFormat: "JSON",
        acceptanceEvidence: "",
      },
    ],
    privateChallenge: true,
    requiresNda: true,
    ndaPlan: null,
    prequalification: "",
  })

  assert.equal(result.status, "blocked")
  assert.ok(result.blockers.includes("deliverable model lacks acceptance evidence"))
  assert.ok(result.blockers.includes("deliverable IDs must be unique"))
  assert.ok(result.blockers.includes("private or NDA challenge needs an NDA plan"))
  assert.ok(result.warnings.includes("sensitive challenge should define prequalification criteria"))
}

console.log("challenge-rubric-readiness-gate tests passed")
