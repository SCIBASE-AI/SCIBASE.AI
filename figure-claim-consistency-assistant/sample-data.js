const manuscript = {
  id: "sci-vision-042",
  title: "Adaptive Imaging Biomarkers for Early Neuroinflammation",
  domain: "clinical-imaging",
  claims: [
    {
      id: "C1",
      text: "The adaptive imaging panel improved lesion detection by 18% across all enrolled cohorts.",
      figureRefs: ["fig-1"],
      tableRefs: ["table-1"],
      metric: "lesion_detection_delta",
      expectedDirection: "increase",
      expectedUnit: "percentage-points",
      reportedEffect: 18,
      reportedSampleSize: 240,
      caveats: ["external validation pending"],
      requiredArtifacts: ["analysis-notebook", "source-data"]
    },
    {
      id: "C2",
      text: "The model remained stable in the low-signal scanner subgroup.",
      figureRefs: ["fig-2"],
      tableRefs: ["table-2"],
      metric: "subgroup_auc_delta",
      expectedDirection: "stable",
      expectedUnit: "auc-delta",
      reportedEffect: 0.01,
      reportedSampleSize: 64,
      caveats: [],
      requiredArtifacts: ["subgroup-manifest", "analysis-notebook"]
    },
    {
      id: "C3",
      text: "Runtime overhead stayed below five minutes per scan.",
      figureRefs: ["fig-3"],
      tableRefs: ["table-3"],
      metric: "runtime_overhead_minutes",
      expectedDirection: "below-threshold",
      expectedUnit: "minutes",
      reportedEffect: 5,
      reportedSampleSize: 240,
      caveats: [],
      requiredArtifacts: ["benchmark-log", "source-data", "analysis-notebook"]
    },
    {
      id: "C4",
      text: "The proposed assistant is ready for multi-site prospective deployment.",
      figureRefs: ["fig-4"],
      tableRefs: ["table-4"],
      metric: "prospective_site_count",
      expectedDirection: "at-least",
      expectedUnit: "sites",
      reportedEffect: 5,
      reportedSampleSize: 5,
      caveats: ["IRB amendments required"],
      requiredArtifacts: ["deployment-protocol", "monitoring-plan"]
    }
  ]
};

const figures = [
  {
    id: "fig-1",
    title: "Lesion detection improvement",
    caption: "Panel A shows a held-out validation comparison. External validation is pending.",
    metric: "lesion_detection_delta",
    axis: { xUnit: "cohort", yUnit: "percentage-points", yLabel: "Detection delta" },
    panels: [
      {
        id: "A",
        direction: "increase",
        effect: 17.6,
        sampleSize: 238,
        caveat: "external validation pending",
        sourceDataId: "source-data",
        analysisNotebookId: "analysis-notebook",
        colorEncodingSafe: true
      }
    ]
  },
  {
    id: "fig-2",
    title: "Scanner subgroup robustness",
    caption: "Low-signal scanner results are exploratory.",
    metric: "subgroup_auc_delta",
    axis: { xUnit: "scanner subgroup", yUnit: "auc-delta", yLabel: "AUC delta" },
    panels: [
      {
        id: "A",
        direction: "decrease",
        effect: -0.06,
        sampleSize: 47,
        caveat: "exploratory subgroup",
        sourceDataId: "source-data",
        analysisNotebookId: "analysis-notebook",
        colorEncodingSafe: false
      }
    ]
  },
  {
    id: "fig-3",
    title: "Runtime overhead by scan",
    caption: "Measured on the production GPU queue.",
    metric: "runtime_overhead_minutes",
    axis: { xUnit: "scan", yUnit: "seconds", yLabel: "Runtime overhead" },
    panels: [
      {
        id: "A",
        direction: "above-threshold",
        effect: 7.8,
        sampleSize: 240,
        caveat: "GPU queue warm cache",
        sourceDataId: "source-data",
        analysisNotebookId: null,
        colorEncodingSafe: true
      }
    ]
  }
];

const tables = [
  {
    id: "table-1",
    title: "Primary detection endpoints",
    rows: [
      {
        claimId: "C1",
        metric: "lesion_detection_delta",
        effect: 17.6,
        unit: "percentage-points",
        sampleSize: 238,
        adjustedPValue: 0.018,
        notes: "External validation pending."
      }
    ]
  },
  {
    id: "table-2",
    title: "Scanner subgroup analysis",
    rows: [
      {
        claimId: "C2",
        metric: "subgroup_auc_delta",
        effect: -0.06,
        unit: "auc-delta",
        sampleSize: 47,
        adjustedPValue: null,
        notes: "Exploratory subgroup; multiplicity adjustment not complete."
      }
    ]
  },
  {
    id: "table-3",
    title: "Runtime benchmarks",
    rows: [
      {
        claimId: "C3",
        metric: "runtime_overhead_minutes",
        effect: 7.8,
        unit: "minutes",
        sampleSize: 240,
        adjustedPValue: null,
        notes: "Benchmark log available; analysis notebook missing."
      }
    ]
  }
];

const artifacts = [
  { id: "source-data", type: "source-data", hash: "sha256:source-vision-042", public: true },
  { id: "analysis-notebook", type: "analysis-notebook", hash: "sha256:notebook-vision-042", public: true },
  { id: "benchmark-log", type: "benchmark-log", hash: "sha256:runtime-log-042", public: true },
  { id: "subgroup-manifest", type: "subgroup-manifest", hash: "sha256:subgroup-042", public: false }
];

module.exports = {
  manuscript,
  figures,
  tables,
  artifacts
};
