const { evaluateReviewerPanel } = require("./index.js");

const panel = {
  challengeTitle: "Open Ocean Carbon Prize",
  phase: "milestone award review",
  submission: {
    id: "sub-2026-112",
    teamId: "team-kelp",
    artifactHashes: ["sha256:field-data", "sha256:model-card", "sha256:analysis-notebook"],
    manifestLockedAt: "2026-05-18T17:05:00Z"
  },
  rubric: {
    version: "v1.4",
    criteria: ["scientific rigor", "reproducibility", "field impact"],
    decisionThreshold: 80,
    maxScoreVariance: 10
  },
  reviewers: [
    {
      id: "rev-ocean-1",
      type: "independent",
      expertise: ["oceanography", "field-methods"],
      conflicts: [],
      scores: { "scientific rigor": 88, reproducibility: 84, "field impact": 91 },
      feedback: "Field protocol and model card support the milestone claim."
    },
    {
      id: "rev-stat-2",
      type: "independent",
      expertise: ["statistics", "carbon-accounting"],
      conflicts: [],
      scores: { "scientific rigor": 85, reproducibility: 86, "field impact": 89 },
      feedback: "Uncertainty intervals are reproducible from the locked notebook."
    },
    {
      id: "rev-sponsor-observer",
      type: "sponsor",
      expertise: ["deployment"],
      conflicts: [],
      scores: { "scientific rigor": 86, reproducibility: 83, "field impact": 90 },
      feedback: "Milestone deliverables match the published challenge terms."
    }
  ],
  decision: {
    proposedOutcome: "award",
    explanation: "Independent reviewers reached a low-variance consensus above threshold.",
    reviewerResponsesDueAt: "2026-05-24T12:00:00Z"
  }
};

const result = evaluateReviewerPanel(panel);

console.log("Reviewer panel consensus monitor demo");
console.log("-------------------------------------");
console.log(`Challenge: ${result.summary.challengeTitle}`);
console.log(`Phase: ${result.summary.phase}`);
console.log(`Panel decision: ${result.summary.panelDecision}`);
console.log(`Consensus quality: ${result.summary.consensusQuality}`);
console.log(`Average score: ${result.summary.averageScore}`);
console.log(`Findings: ${result.summary.findingCount}`);
console.log(`Digest: ${result.arbitrationPacket.digest}`);
console.log("Required actions:");
for (const action of result.arbitrationPacket.requiredActions) {
  console.log(`- ${action}`);
}
