export const project = {
  id: "urban-heat-health",
  title: "Urban Heat Exposure and Emergency Room Demand",
  domain: "machine_learning",
  abstract:
    "We model emergency room demand during urban heat events using weather, neighborhood tree canopy, and hospital capacity data.",
  methods:
    "Gradient boosted model with benchmark comparison and temporal holdout validation.",
  citations: ["heat-health-2024", "tree-canopy-2025"],
  files: ["README.md", "requirements.txt", "src/pipeline.py"],
  environment: { locked: false },
  claims: [
    {
      id: "c1",
      text: "Tree canopy moderates heat-related emergency demand."
    },
    {
      id: "c2",
      text: "The model generalizes across all hospital regions."
    }
  ],
  evidence: [
    {
      id: "e1",
      claimIds: ["c1"],
      source: "Figure 2 canopy interaction analysis"
    }
  ],
  results: [
    { name: "primary_auc", value: 0.81, deterministic: true },
    { name: "regional_transfer", value: 0.68, deterministic: false }
  ]
};

export const corpus = [
  {
    id: "paper-a",
    title: "Urban Heat Islands and Hospital Load",
    abstract: "Heat islands influence hospital load and emergency room demand.",
    unresolvedQuestions: ["How do cooling centers change demand?"],
    replicationCount: 1,
    negativeResults: false
  },
  {
    id: "paper-b",
    title: "Tree Canopy Equity in Public Health Planning",
    abstract: "Tree canopy interventions are unevenly distributed across neighborhoods.",
    unresolvedQuestions: [
      "Which neighborhoods benefit first?",
      "How should benefits be measured?"
    ],
    replicationCount: 0,
    negativeResults: true
  },
  {
    id: "paper-c",
    title: "Benchmarking Emergency Forecast Models",
    abstract: "Forecast models need calibration and external hospital validation.",
    unresolvedQuestions: [],
    replicationCount: 4,
    negativeResults: false
  }
];
