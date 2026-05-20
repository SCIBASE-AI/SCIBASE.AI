const { buildDisclosurePacket } = require("./index")

const challenge = {
  id: "bio-marker-forecast-2026",
  visibility: "private",
  ndaRequired: true,
  ipPolicy: "transfer_on_payout",
  evaluationMode: "reviewer_only",
  sensitiveDomains: ["single-cell-rna", "clinical"],
}

const submission = {
  id: "sub-lab-17",
  team: {
    id: "solver-team-aurora",
    displayMode: "anonymous_until_shortlist",
  },
  artifacts: [
    {
      id: "whitepaper",
      title: "Biomarker Method Summary",
      kind: "document",
      confidential: true,
      ipProtected: false,
      content: "Feature-selection method, validation cohort, and benchmark summary.",
      safeSummary: "High-level biomarker validation summary is available to NDA reviewers.",
    },
    {
      id: "model-weights",
      title: "Trained Model Weights",
      kind: "model",
      confidential: true,
      ipProtected: true,
      content: "solver-owned weight matrix and proprietary feature ranking formula",
      safeSummary: "Model weights are committed by hash and withheld until payout settlement.",
    },
    {
      id: "clinical-table",
      title: "Clinical Feature Table",
      kind: "dataset",
      confidential: true,
      containsHumanSubjectsData: true,
      ipProtected: false,
      content: "synthetic patient-level feature rows",
      safeSummary: "Human-subjects table is held pending ethics clearance.",
    },
  ],
}

const sponsorBeforePayout = buildDisclosurePacket({
  challenge,
  submission,
  actor: { role: "sponsor", id: "sponsor-pharma", ndaSigned: true },
  settlement: { status: "under_review", ethicsCleared: false },
})

const reviewerPacket = buildDisclosurePacket({
  challenge,
  submission,
  actor: { role: "reviewer", id: "reviewer-2", ndaSigned: true, clearance: "full" },
  settlement: { status: "under_review", ethicsCleared: true },
})

const sponsorAfterSettlement = buildDisclosurePacket({
  challenge,
  submission,
  actor: { role: "sponsor", id: "sponsor-pharma", ndaSigned: true },
  settlement: { status: "funded_settled", ethicsCleared: true },
})

console.log("Sponsor before payout")
console.log(JSON.stringify(sponsorBeforePayout, null, 2))
console.log("\nReviewer packet")
console.log(JSON.stringify(reviewerPacket, null, 2))
console.log("\nSponsor after funded settlement")
console.log(JSON.stringify(sponsorAfterSettlement, null, 2))
