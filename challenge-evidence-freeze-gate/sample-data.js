const challenge = {
  id: "challenge-cell-atlas-forecast",
  title: "Single-cell biomarker forecast challenge",
  deadline: "2026-05-18T23:59:59Z",
  reviewOpenedAt: "2026-05-19T09:00:00Z",
  prizeAmountUsd: 100000,
  rules: {
    allowPostDeadlineMetadataFixes: true,
    requireReviewerVisibleJustification: true,
    blockLatePrimaryArtifacts: true,
    blockChecksumDrift: true,
    blockMetricDrift: true
  }
};

const frozenSubmission = {
  submissionId: "team-northlake-final",
  teamId: "team-northlake",
  frozenAt: "2026-05-18T23:58:44Z",
  manifestHash: "sha256:frozen-manifest-001",
  artifacts: [
    {
      id: "model",
      path: "models/biomarker-forecast.pkl",
      type: "primary-model",
      checksum: "sha256:model-v1",
      bytes: 2481000,
      metric: { name: "heldout_auc", value: 0.842 },
      metadata: { license: "solver-retained-until-paid", reviewerVisible: true }
    },
    {
      id: "notebook",
      path: "analysis/final-evaluation.ipynb",
      type: "analysis-notebook",
      checksum: "sha256:notebook-v1",
      bytes: 811000,
      metric: { name: "rerun_status", value: "passed" },
      metadata: { kernel: "python3.12", reviewerVisible: true }
    },
    {
      id: "whitepaper",
      path: "docs/methods-whitepaper.pdf",
      type: "whitepaper",
      checksum: "sha256:whitepaper-v1",
      bytes: 402200,
      metric: { name: "page_count", value: 12 },
      metadata: { license: "solver-retained-until-paid", reviewerVisible: true }
    }
  ]
};

const currentSubmission = {
  submissionId: "team-northlake-final",
  teamId: "team-northlake",
  observedAt: "2026-05-19T14:12:00Z",
  manifestHash: "sha256:current-manifest-002",
  artifacts: [
    {
      id: "model",
      path: "models/biomarker-forecast.pkl",
      type: "primary-model",
      checksum: "sha256:model-v2",
      bytes: 2481400,
      metric: { name: "heldout_auc", value: 0.861 },
      metadata: { license: "solver-retained-until-paid", reviewerVisible: true },
      exceptionJustification: "retrained after discovering seed typo"
    },
    {
      id: "notebook",
      path: "analysis/final-evaluation.ipynb",
      type: "analysis-notebook",
      checksum: "sha256:notebook-v1",
      bytes: 811000,
      metric: { name: "rerun_status", value: "passed" },
      metadata: { kernel: "python3.12", reviewerVisible: true }
    },
    {
      id: "whitepaper",
      path: "docs/methods-whitepaper.pdf",
      type: "whitepaper",
      checksum: "sha256:whitepaper-v1",
      bytes: 405900,
      metric: { name: "page_count", value: 13 },
      metadata: { license: "solver-retained-until-paid", reviewerVisible: true },
      exceptionJustification: "added funding acknowledgement only"
    },
    {
      id: "supplement",
      path: "supplement/post-deadline-ablation.csv",
      type: "primary-result",
      checksum: "sha256:late-ablation",
      bytes: 78000,
      metric: { name: "ablation_gain", value: 0.04 },
      metadata: { license: "solver-retained-until-paid", reviewerVisible: true },
      exceptionJustification: ""
    }
  ]
};

module.exports = {
  challenge,
  frozenSubmission,
  currentSubmission
};
