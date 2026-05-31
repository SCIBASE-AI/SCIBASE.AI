"use strict";

const sampleChallenge = {
  checkedAt: "2026-05-31T07:05:00.000Z",
  policy: {
    maxSubmissionSimilarity: 0.72,
    maxSharedArtifactRatio: 0.35,
  },
  submissions: [
    {
      id: "sub-alpha",
      teamIds: ["team-redwood"],
      solvers: [{ id: "@solver-one" }, { id: "student-a" }],
      paymentRoutes: [{ network: "stripe", account: "acct_redwood" }],
      abstract: "Regional climate forecasting model using sensor fusion and uncertainty estimates.",
      deliverablesSummary: "Notebook, model weights, forecast dashboard, and reproducibility manifest.",
      artifacts: [
        { path: "models/regional-forecast.bin", sha256: "sha256:aaa111" },
        { path: "notebooks/analysis.ipynb", sha256: "sha256:bbb222" },
      ],
    },
    {
      id: "sub-beta",
      teamIds: ["team-redwood"],
      solvers: [{ id: "solver-one" }, { id: "student-b" }],
      paymentRoutes: [{ network: "stripe", account: "acct_redwood" }],
      abstract: "Regional climate forecasting model using sensor fusion and uncertainty estimates.",
      deliverablesSummary: "Notebook, model weights, forecast dashboard, and reproducibility manifest.",
      artifacts: [
        { path: "models/regional-forecast-copy.bin", sha256: "sha256:aaa111" },
        { path: "notebooks/analysis-copy.ipynb", sha256: "sha256:bbb222" },
      ],
    },
    {
      id: "sub-gamma",
      teamIds: ["team-ocean"],
      solvers: [{ id: "solver-three" }],
      paymentRoutes: [{ network: "bank", account: "institutional-lab-42" }],
      abstract: "Ocean temperature benchmark using independent buoy feeds and confidence intervals.",
      deliverablesSummary: "CSV source manifest, validation notebook, model card, and signed result packet.",
      artifacts: [
        { path: "data/buoy.csv", sha256: "sha256:ccc333" },
        { path: "reports/model-card.md", sha256: "sha256:ddd444" },
      ],
    },
    {
      id: "sub-delta",
      teamIds: ["team-sky"],
      solvers: [{ id: "solver-four" }],
      paymentRoutes: [{ network: "bank", account: "institutional-lab-42" }],
      abstract: "Atmospheric nowcasting benchmark with satellite imagery and uncertainty intervals.",
      deliverablesSummary: "Source manifest, validation notebook, model card, and signed forecast packet.",
      artifacts: [
        { path: "data/satellite.csv", sha256: "sha256:eee555" },
        { path: "reports/model-card.md", sha256: "sha256:fff666" },
      ],
    },
  ],
};

module.exports = { sampleChallenge };
