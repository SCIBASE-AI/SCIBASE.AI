export const sampleSubscription = {
  planId: "institution",
  seats: 42,
  billingCycle: "annual",
  couponCode: "CONSORTIUM_12",
  volumeDiscountPct: 8
};

export const sampleUsageEvents = [
  { type: "ai_inference", credits: 32000, projectId: "climate-model-audit" },
  { type: "ai_inference", credits: 18000, projectId: "literature-map" },
  { type: "reproducibility_job", hours: 84.5, projectId: "notebook-run-193" },
  { type: "reproducibility_job", hours: 31.25, projectId: "pipeline-replay-007" },
  { type: "storage", gbMonths: 940, projectId: "open-dataset-lake" }
];

export const sampleTopUps = [
  {
    id: "topup-001",
    kind: "purchase",
    credits: 50000,
    source: "institutional_po"
  },
  {
    id: "usage-001",
    kind: "debit",
    credits: 11000,
    source: "extra_peer_review_batch"
  }
];

export const sampleDatasets = [
  {
    id: "citation-network-q2",
    fields: ["doi", "cited_by", "discipline", "year"],
    refreshCadence: "weekly"
  },
  {
    id: "reproducibility-score-trends",
    fields: ["domain", "score_bucket", "attempt_count"],
    refreshCadence: "daily"
  },
  {
    id: "private-lab-notes",
    fields: ["raw_note_text"],
    refreshCadence: "never",
    privateContent: true
  }
];

export const sampleInstitution = {
  name: "Northbridge Research Consortium",
  slug: "northbridge"
};
