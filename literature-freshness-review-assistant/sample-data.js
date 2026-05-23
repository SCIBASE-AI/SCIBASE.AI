const freshnessPolicy = {
  reviewDate: "2026-05-23",
  staleAfterYears: 4,
  contradictionSeverity: "critical",
  requiredEvidenceTypes: [
    "systematic_review",
    "guideline",
    "dataset_release",
    "benchmark_update"
  ],
  holdSeverityCutoff: "critical"
};

const evidenceLedger = {
  signals: [
    {
      id: "ev-sr-2025-senolytic-cardiometabolic",
      topic: "senolytic cardiometabolic safety",
      evidenceType: "systematic_review",
      title: "2025 systematic review of senolytic cardiometabolic safety",
      published: "2025-11-18",
      relation: "contradicts",
      requirement: "Discuss the larger safety signal before claiming broad tolerability.",
      minCitationDate: "2025-11-18"
    },
    {
      id: "ev-guide-2026-organoid-reporting",
      topic: "organoid assay reporting",
      evidenceType: "guideline",
      title: "SCIBASE organoid reporting guidance 2026.1",
      published: "2026-02-04",
      relation: "updates",
      requirement: "Use the 2026.1 organoid reporting checklist for reviewer packets.",
      minCitationDate: "2026-02-04"
    },
    {
      id: "ev-data-2026-single-cell-atlas-v4",
      topic: "single-cell atlas normalization",
      evidenceType: "dataset_release",
      title: "Single Cell Atlas v4.0 release notes",
      published: "2026-03-14",
      relation: "supersedes",
      currentVersion: "v4.0",
      requirement: "Reconcile claims trained on atlas v2.x or v3.x against v4.0 annotations.",
      minCitationDate: "2026-03-14"
    },
    {
      id: "ev-bench-2026-protein-leaderboard",
      topic: "protein structure benchmark",
      evidenceType: "benchmark_update",
      title: "Protein structure benchmark leaderboard recalibration",
      published: "2026-01-22",
      relation: "updates",
      currentVersion: "2026.01",
      requirement: "Refresh benchmark claims against the recalibrated 2026.01 leaderboard.",
      minCitationDate: "2026-01-22"
    },
    {
      id: "ev-sr-2024-telemetry-implant",
      topic: "telemetry implant arrhythmia",
      evidenceType: "systematic_review",
      title: "2024 telemetry implant arrhythmia meta-analysis",
      published: "2024-09-20",
      relation: "supports",
      requirement: "Current support is acceptable if cited with the 2024 meta-analysis.",
      minCitationDate: "2024-09-20"
    }
  ]
};

const manuscriptPackets = [
  {
    id: "ms-hold-senolytic-review",
    title: "Senolytic cardiac safety manuscript",
    domain: "translational cardiometabolic biology",
    claims: [
      {
        id: "claim-tolerability",
        text: "The senolytic cocktail is broadly well tolerated across cardiometabolic cohorts.",
        topic: "senolytic cardiometabolic safety",
        supportCitationIds: ["trial-2019-small", "review-2021-safety"],
        citationYears: [2019, 2021],
        citationDates: ["2019-08-15", "2021-06-01"],
        citedCurrentSignalIds: [],
        tone: "broad"
      },
      {
        id: "claim-organoid-methods",
        text: "The organoid assay follows current field reporting guidance.",
        topic: "organoid assay reporting",
        supportCitationIds: ["organoid-checklist-2022"],
        citationYears: [2022],
        citationDates: ["2022-02-10"],
        citedCurrentSignalIds: [],
        tone: "current"
      },
      {
        id: "claim-atlas-normalization",
        text: "The single-cell normalization pipeline reflects current atlas annotations.",
        topic: "single-cell atlas normalization",
        supportCitationIds: ["atlas-v2-release"],
        citationYears: [2021],
        citationDates: ["2021-12-12"],
        citedCurrentSignalIds: [],
        datasetVersion: "v2.1",
        tone: "current"
      },
      {
        id: "claim-protein-benchmark",
        text: "The model remains state-of-the-art on the protein structure benchmark.",
        topic: "protein structure benchmark",
        supportCitationIds: ["leaderboard-2024-10"],
        citationYears: [2024],
        citationDates: ["2024-10-05"],
        citedCurrentSignalIds: [],
        benchmarkVersion: "2024.10",
        tone: "state-of-the-art"
      }
    ]
  },
  {
    id: "ms-ready-telemetry-review",
    title: "Telemetry implant arrhythmia replication note",
    domain: "clinical devices",
    claims: [
      {
        id: "claim-telemetry-risk",
        text: "Telemetry implant arrhythmia risk is consistent with the latest meta-analysis.",
        topic: "telemetry implant arrhythmia",
        supportCitationIds: ["telemetry-meta-2024"],
        citationYears: [2024],
        citationDates: ["2024-09-20"],
        citedCurrentSignalIds: ["ev-sr-2024-telemetry-implant"],
        tone: "calibrated"
      }
    ]
  }
];

module.exports = {
  freshnessPolicy,
  evidenceLedger,
  manuscriptPackets
};
