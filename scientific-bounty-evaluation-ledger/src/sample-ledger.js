export const challenge = {
  id: "open-replication-challenge",
  title: "Open Replication Challenge",
  budgetUsd: 1000,
  acceptanceThreshold: 0.82,
  arbitrationSpread: 0.22,
  requiredEvidence: ["repository", "reproducibility", "demo", "license", "data"],
  criteria: [
    { id: "scientific-validity", label: "Scientific validity", weight: 4, minimum: 0.75 },
    { id: "reproducibility", label: "Reproducibility", weight: 3, minimum: 0.75 },
    { id: "documentation", label: "Documentation", weight: 2, minimum: 0.7 },
    { id: "impact", label: "Research impact", weight: 1, minimum: 0.65 },
  ],
  milestones: [
    { id: "evidence-package", label: "Evidence package accepted", amountUsd: 300 },
    { id: "review-pass", label: "Reviewer score threshold met", amountUsd: 500 },
    { id: "final-handoff", label: "Final IP and payout handoff", amountUsd: 200 },
  ],
  ipPolicy: {
    transferOnAwardOnly: true,
    licenseRequired: "MIT OR Apache-2.0 compatible",
  },
};

export const submission = {
  id: "replication-ledger-v1",
  title: "Replication package with deterministic evaluation ledger",
  contributors: ["Robertg761"],
  affiliations: ["Independent"],
  declaredRelationships: [],
  requestedMilestones: ["evidence-package", "review-pass", "final-handoff"],
  evidence: {
    repository: "https://github.com/example/replication-ledger",
    reproducibility: "npm test and recorded fixture outputs",
    demo: "npm run demo",
    license: "MIT",
    data: "fixtures/open-replication-sample.json",
  },
};

export const reviews = [
  {
    reviewer: "reviewer-a",
    affiliations: ["SCIBASE Review Guild"],
    scores: {
      "scientific-validity": 0.88,
      reproducibility: 0.92,
      documentation: 0.86,
      impact: 0.78,
    },
    notes: "Evidence package is complete and reproducible.",
  },
  {
    reviewer: "reviewer-b",
    affiliations: ["External Methods Lab"],
    scores: {
      "scientific-validity": 0.84,
      reproducibility: 0.87,
      documentation: 0.82,
      impact: 0.8,
    },
    notes: "Recommend award after final handoff.",
  },
];
