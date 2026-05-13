export const sampleChallenge = {
  id: "challenge-biomarker-single-cell",
  title: "Identify reproducible biomarkers from single-cell RNA-seq response data",
  sponsor: { id: "sponsor-climate-bio-lab", name: "Open Translational Biology Lab" },
  visibility: "public",
  ndaRequired: false,
  participantMode: "named-or-anonymous",
  prizePoolUsd: 100000,
  escrow: { funded: true, provider: "platform-held", reference: "escrow-demo-2026-05" },
  timeline: {
    proposalDue: "2026-06-15",
    prototypeDue: "2026-07-15",
    finalDue: "2026-08-30"
  },
  phases: [
    { id: "proposal", prizePercent: 10, requiredDeliverables: ["research-plan", "team-disclosure"] },
    { id: "prototype", prizePercent: 30, requiredDeliverables: ["working-model", "validation-notebook"] },
    { id: "final", prizePercent: 60, requiredDeliverables: ["final-report", "reproducibility-package", "license-election"] }
  ],
  deliverables: [
    { id: "working-model", description: "Runnable biomarker ranking model", required: true },
    { id: "validation-notebook", description: "Notebook reproducing validation metrics", required: true },
    { id: "final-report", description: "Scientific report with limitations", required: true },
    { id: "reproducibility-package", description: "Manifest, checksums, environment, and seed list", required: true },
    { id: "license-election", description: "IP transfer or open-license election", required: true }
  ],
  rubric: [
    { id: "scientific-validity", weight: 35, description: "Evidence quality, statistics, and limitations" },
    { id: "reproducibility", weight: 25, description: "Runnable package, data provenance, and deterministic outputs" },
    { id: "novelty", weight: 15, description: "Novel insight versus known approaches" },
    { id: "impact", weight: 15, description: "Usefulness to sponsor and broader community" },
    { id: "communication", weight: 10, description: "Clarity of report and artifact documentation" }
  ],
  ipPolicy: "transfer-upon-payout"
};

export const sampleSubmission = {
  id: "submission-organoid-biomarkers",
  challengeId: "challenge-biomarker-single-cell",
  team: {
    id: "team-open-organoid",
    displayName: "Open Organoid Methods Group",
    recipientType: "team",
    members: [
      { id: "solver-1", role: "modeling", payoutShare: 60 },
      { id: "solver-2", role: "validation", payoutShare: 40 }
    ],
    institution: { id: "inst-1", name: "Independent Research Cooperative", payoutShare: 10 }
  },
  participantMode: "named",
  disclosureLevel: "protected-until-award",
  artifacts: [
    { id: "research-plan", type: "document", checksum: "sha256:plan", present: true },
    { id: "team-disclosure", type: "metadata", checksum: "sha256:team", present: true },
    { id: "working-model", type: "code", checksum: "sha256:model", present: true },
    { id: "validation-notebook", type: "notebook", checksum: "sha256:notebook", present: true },
    { id: "final-report", type: "document", checksum: "sha256:report", present: true },
    { id: "reproducibility-package", type: "archive", checksum: "sha256:repro", present: true },
    { id: "license-election", type: "legal", checksum: "sha256:license", present: true }
  ],
  auditLog: [
    { at: "2026-06-01T10:00:00Z", actor: "team-open-organoid", action: "created-private-workspace" },
    { at: "2026-07-14T16:30:00Z", actor: "team-open-organoid", action: "uploaded-prototype" },
    { at: "2026-08-29T19:45:00Z", actor: "team-open-organoid", action: "sealed-final-package" }
  ],
  scores: {
    "scientific-validity": 31,
    reproducibility: 24,
    novelty: 12,
    impact: 13,
    communication: 9
  },
  reviewerVotes: [
    { reviewer: "peer-validator-a", score: 88, recommendation: "award", note: "Strong reproducibility package." },
    { reviewer: "domain-reviewer-b", score: 86, recommendation: "award", note: "Clear limitations and validation." }
  ],
  sponsorFeedback: ["Request public limitations appendix before full IP transfer."],
  ipElection: "transfer-upon-payout"
};
