export const reviews = [
  {
    id: "rev-100",
    projectId: "protein-folding-open-set",
    reviewerId: "researcher-ada",
    mode: "public",
    discipline: "computational biology",
    summary: "Clear method section with reproducibility caveats called out.",
    conflictDeclared: false,
    scores: { clarity: 5, rigor: 4, novelty: 4, reproducibility: 3 }
  },
  {
    id: "rev-101",
    projectId: "protein-folding-open-set",
    reviewerId: "researcher-ada",
    mode: "semi_private",
    discipline: "machine learning",
    summary: "Internal feedback about ablation coverage.",
    conflictDeclared: false,
    scores: { clarity: 4, rigor: 5, novelty: 4, reproducibility: 4 }
  },
  {
    id: "rev-102",
    projectId: "protein-folding-open-set",
    reviewerId: "researcher-lin",
    mode: "anonymous",
    discipline: "statistics",
    summary: "Blind review focused on uncertainty reporting.",
    conflictDeclared: true,
    scores: { clarity: 3, rigor: 4, novelty: 3, reproducibility: 2 }
  }
];

export const comments = [
  {
    id: "c-1",
    projectId: "protein-folding-open-set",
    authorId: "researcher-ada",
    targetKind: "notebook",
    path: "analysis/fold_scores.ipynb",
    selector: "cell:14",
    body: "Seed value should be stated near the benchmark table.",
    visibility: "public",
    resolved: true
  },
  {
    id: "c-2",
    projectId: "protein-folding-open-set",
    authorId: "researcher-lin",
    targetKind: "dataset",
    path: "data/holdout.csv",
    selector: "column:source_lab",
    body: "Consider documenting lab-level stratification.",
    visibility: "semi_private",
    resolved: false
  }
];

export const contributions = [
  { projectId: "protein-folding-open-set", userId: "researcher-ada", role: "peer_review", units: 3 },
  { projectId: "protein-folding-open-set", userId: "researcher-ada", role: "validation", units: 2 },
  { projectId: "protein-folding-open-set", userId: "researcher-lin", role: "data_curation", units: 4 },
  { projectId: "protein-folding-open-set", userId: "researcher-lin", role: "writing", units: 1 },
  { projectId: "protein-folding-open-set", userId: "researcher-mir", role: "software", units: 5 }
];

export const endorsements = {
  "researcher-ada": ["lab-pi", "journal-editor"],
  "researcher-lin": ["dataset-steward"],
  "researcher-mir": []
};

export const bounties = {
  "researcher-ada": { completed: 2, reproducibilityBadges: 1 },
  "researcher-lin": { completed: 1, reproducibilityBadges: 0 },
  "researcher-mir": { completed: 3, reproducibilityBadges: 2 }
};
