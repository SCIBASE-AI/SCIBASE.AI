const challenge = {
  id: "challenge-biomarker-001",
  title: "Identify candidate biomarkers from single-cell RNA-seq data",
  requiredDeliverables: ["whitepaper", "dataset", "notebook"],
  minimumIndependentReviews: 2,
  passingScore: 82,
  rubric: [
    {id: "scientific_validity", label: "Scientific validity", weight: 40, maxScore: 10},
    {id: "reproducibility", label: "Reproducibility", weight: 30, maxScore: 10},
    {id: "delivery_quality", label: "Delivery quality", weight: 20, maxScore: 10},
    {id: "ip_readiness", label: "IP readiness", weight: 10, maxScore: 10},
  ],
  milestones: [
    {id: "phase-1-accepted", amountUsd: 300},
    {id: "final-award", amountUsd: 700},
  ],
};

const submission = {
  id: "submission-team-42",
  teamId: "team-42",
  affiliation: "Open Biomarker Lab",
  contributors: [
    {id: "researcher-a", share: 60},
    {id: "researcher-b", share: 40},
  ],
  artifacts: [
    {
      id: "artifact-whitepaper",
      type: "whitepaper",
      name: "biomarker-findings.md",
      license: "CC-BY-4.0",
      content: "Ranked biomarker candidates with validation rationale.",
    },
    {
      id: "artifact-dataset",
      type: "dataset",
      name: "marker-evidence.csv",
      license: "CC-BY-4.0",
      content: "gene,score\nCD74,0.91\nCXCL10,0.87",
    },
    {
      id: "artifact-notebook",
      type: "notebook",
      name: "analysis.ipynb",
      license: "MIT",
      content: {cells: [{source: "normalize_counts(); rank_markers();"}]},
    },
  ],
};

const reviews = [
  {
    id: "review-1",
    reviewer: {id: "reviewer-1", affiliation: "Independent Review Guild", teamId: "reviewer-team-a"},
    scores: {
      scientific_validity: 9,
      reproducibility: 8,
      delivery_quality: 9,
      ip_readiness: 8,
    },
  },
  {
    id: "review-2",
    reviewer: {id: "reviewer-2", affiliation: "University Validation Center", teamId: "reviewer-team-b"},
    scores: {
      scientific_validity: 8,
      reproducibility: 9,
      delivery_quality: 9,
      ip_readiness: 9,
    },
  },
  {
    id: "review-conflicted",
    reviewer: {id: "reviewer-3", affiliation: "Open Biomarker Lab", teamId: "reviewer-team-c"},
    scores: {
      scientific_validity: 10,
      reproducibility: 10,
      delivery_quality: 10,
      ip_readiness: 10,
    },
  },
];

module.exports = {challenge, reviews, submission};
