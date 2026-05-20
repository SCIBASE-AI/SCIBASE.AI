const canonicalDocument = {
  id: "collab-ms-127",
  title: "Hybrid Bayesian Imaging Biomarkers",
  version: "v4.2.0",
  publicationStyle: "nature",
  blocks: [
    {
      id: "intro-eq-1",
      type: "equation",
      label: "eq:posterior-update",
      latex: "p(\\theta | y) \\propto p(y | \\theta)p(\\theta)",
      inlineMarkdown: "$p(\\theta | y) \\propto p(y | \\theta)p(\\theta)$",
      references: ["smith2024-bayes", "nguyen2025-imaging"],
      comments: ["resolve prior sensitivity note"],
      suggestions: ["explain weakly informative prior"],
      requiredFormats: ["markdown", "latex", "notebook"]
    },
    {
      id: "fig-signal",
      type: "figure",
      label: "fig:signal-panel",
      caption: "Posterior signal trajectories by scanner cohort.",
      sourceAsset: "figures/signal-panel.svg",
      references: ["cohort-registry"],
      comments: ["confirm color-safe palette"],
      suggestions: [],
      requiredFormats: ["markdown", "latex", "notebook"]
    },
    {
      id: "table-cohorts",
      type: "table",
      label: "tab:cohort-balance",
      caption: "Cohort balance after scanner harmonization.",
      columns: ["cohort", "n", "median_age", "scanner_family"],
      references: ["cohort-registry", "harmonization-lockfile"],
      comments: [],
      suggestions: ["add missing data footnote"],
      requiredFormats: ["markdown", "latex"]
    },
    {
      id: "cell-harmonize",
      type: "notebook-cell",
      label: "cell:harmonize",
      language: "python",
      sourceHash: "sha256:cell-source-harmonize",
      outputHash: "sha256:cell-output-harmonize",
      executionCount: 18,
      references: ["harmonization-lockfile"],
      comments: ["rerun after cohort freeze"],
      suggestions: [],
      requiredFormats: ["notebook"]
    }
  ],
  crossReferences: [
    { from: "intro-eq-1", to: "fig-signal", kind: "supports-claim" },
    { from: "cell-harmonize", to: "table-cohorts", kind: "produces-summary" },
    { from: "table-cohorts", to: "fig-signal", kind: "shared-cohort" }
  ]
};

const roundTripExports = [
  {
    format: "markdown",
    exporter: "collab-md-v2",
    importer: "collab-md-v2",
    timestamp: "2026-05-20T09:40:00Z",
    blocks: [
      {
        id: "intro-eq-1",
        type: "equation",
        label: "eq:posterior-update",
        latex: "p(\\theta | y) \\propto p(y | \\theta)p(\\theta)",
        references: ["smith2024-bayes", "nguyen2025-imaging"],
        comments: ["resolve prior sensitivity note"],
        suggestions: ["explain weakly informative prior"]
      },
      {
        id: "fig-signal",
        type: "figure",
        label: "fig:signal-panel",
        caption: "Posterior signal trajectories by scanner cohort.",
        sourceAsset: "figures/signal-panel.svg",
        references: ["cohort-registry"],
        comments: ["confirm color-safe palette"],
        suggestions: []
      },
      {
        id: "table-cohorts",
        type: "table",
        label: "tab:cohort-balance",
        caption: "Cohort balance after scanner harmonization.",
        columns: ["cohort", "n", "median_age", "scanner_family"],
        references: ["cohort-registry"],
        comments: [],
        suggestions: []
      }
    ],
    crossReferences: [
      { from: "intro-eq-1", to: "fig-signal", kind: "supports-claim" },
      { from: "table-cohorts", to: "fig-signal", kind: "shared-cohort" }
    ]
  },
  {
    format: "latex",
    exporter: "collab-tex-v1",
    importer: "collab-tex-v1",
    timestamp: "2026-05-20T09:42:00Z",
    blocks: [
      {
        id: "intro-eq-1",
        type: "equation",
        label: "eq:posterior-update",
        latex: "p(\\theta | y) = p(y | \\theta)p(\\theta)",
        references: ["smith2024-bayes"],
        comments: [],
        suggestions: ["explain weakly informative prior"]
      },
      {
        id: "fig-signal",
        type: "figure",
        label: "fig:signal-panel",
        caption: "Posterior signal trajectories by scanner cohort.",
        sourceAsset: "figures/signal-panel.pdf",
        references: ["cohort-registry"],
        comments: ["confirm color-safe palette"],
        suggestions: []
      },
      {
        id: "table-cohorts",
        type: "table",
        label: "tab:cohort-balance",
        caption: "Cohort balance after scanner harmonization.",
        columns: ["cohort", "n", "scanner_family"],
        references: ["cohort-registry", "harmonization-lockfile"],
        comments: [],
        suggestions: ["add missing data footnote"]
      }
    ],
    crossReferences: [
      { from: "intro-eq-1", to: "fig-signal", kind: "supports-claim" },
      { from: "cell-harmonize", to: "table-cohorts", kind: "produces-summary" },
      { from: "table-cohorts", to: "fig-signal", kind: "shared-cohort" }
    ]
  },
  {
    format: "notebook",
    exporter: "collab-ipynb-v3",
    importer: "collab-ipynb-v3",
    timestamp: "2026-05-20T09:44:00Z",
    blocks: [
      {
        id: "intro-eq-1",
        type: "equation",
        label: "eq:posterior-update",
        latex: "p(\\theta | y) \\propto p(y | \\theta)p(\\theta)",
        references: ["smith2024-bayes", "nguyen2025-imaging"],
        comments: ["resolve prior sensitivity note"],
        suggestions: []
      },
      {
        id: "fig-signal",
        type: "figure",
        label: "fig:signal-panel",
        caption: "Posterior signal trajectories by scanner cohort.",
        sourceAsset: "figures/signal-panel.svg",
        references: ["cohort-registry"],
        comments: [],
        suggestions: []
      },
      {
        id: "cell-harmonize",
        type: "notebook-cell",
        label: "cell:harmonize",
        language: "python",
        sourceHash: "sha256:cell-source-harmonize",
        outputHash: "sha256:cell-output-stale",
        executionCount: 12,
        references: ["harmonization-lockfile"],
        comments: ["rerun after cohort freeze"],
        suggestions: []
      }
    ],
    crossReferences: [
      { from: "intro-eq-1", to: "fig-signal", kind: "supports-claim" }
    ]
  }
];

module.exports = {
  canonicalDocument,
  roundTripExports
};
