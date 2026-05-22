const sampleProject = {
  id: "scibase-rncs-demo",
  title: "Single-cell CRISPR screens for neuroinflammation modifier discovery",
  domain: "computational biology",
  manuscriptVersion: "2026.05-preprint",
  reviewPolicy: {
    quarantineRetractedPrimaryEvidence: true,
    requireReplacementForSupersededPreprints: true,
    requireCorrectionAcknowledgement: true
  },
  claims: [
    {
      id: "C-101",
      section: "Abstract",
      text: "The perturbation panel reduces off-target edits by 41 percent across microglia cell lines.",
      citationIds: ["REF-CRISPR-RETRACTED", "REF-ATLAS-ACTIVE"],
      evidenceRole: "primary",
      releaseImpact: "headline claim"
    },
    {
      id: "C-204",
      section: "Results",
      text: "The immune-cell atlas fully resolves cell-state drift after perturbation.",
      citationIds: ["REF-ATLAS-CONCERN", "REF-PIPELINE-ACTIVE"],
      evidenceRole: "supporting",
      releaseImpact: "mechanistic interpretation"
    },
    {
      id: "C-318",
      section: "Discussion",
      text: "Prior replication work confirms a large 0.42 effect size in independent cohorts.",
      citationIds: ["REF-EFFECT-CORRECTED"],
      evidenceRole: "primary",
      releaseImpact: "replication strength"
    },
    {
      id: "C-402",
      section: "Methods",
      text: "The manuscript follows the latest public benchmark split for perturbation recovery.",
      citationIds: ["REF-PREPRINT-SUPERSEDED"],
      evidenceRole: "supporting",
      releaseImpact: "benchmark comparability"
    }
  ],
  references: [
    {
      id: "REF-CRISPR-RETRACTED",
      title: "High-throughput off-target CRISPR editing in activated microglia",
      doi: "10.5555/synthetic.crispr.2024.018",
      year: 2024,
      source: "Journal of Synthetic Neurogenomics",
      status: "retracted",
      evidenceRole: "primary",
      notice: {
        type: "retraction",
        date: "2026-02-14",
        reason: "Synthetic notice: unverifiable cell-line provenance and duplicated image panels.",
        source: "Synthetic Retraction Registry",
        scope: "entire article"
      },
      supportsClaimIds: ["C-101"]
    },
    {
      id: "REF-ATLAS-CONCERN",
      title: "Immune-cell atlas of perturbation recovery after inflammatory challenge",
      doi: "10.5555/synthetic.atlas.2025.044",
      year: 2025,
      source: "Synthetic Cell Systems",
      status: "expression_of_concern",
      evidenceRole: "supporting",
      notice: {
        type: "expression_of_concern",
        date: "2026-04-06",
        reason: "Synthetic notice: unresolved batch-label audit for a public single-cell dataset.",
        source: "Synthetic Publisher Notice Feed",
        scope: "dataset labels"
      },
      supportsClaimIds: ["C-204"]
    },
    {
      id: "REF-EFFECT-CORRECTED",
      title: "Replication effect sizes for CRISPR perturbation recovery",
      doi: "10.5555/synthetic.replication.2025.071",
      year: 2025,
      source: "Synthetic Reproducibility Reports",
      status: "major_correction",
      evidenceRole: "primary",
      assertedEffect: "0.42 standardized mean difference",
      correctedEffect: "0.08 standardized mean difference after cohort deduplication",
      notice: {
        type: "major_correction",
        date: "2026-01-25",
        reason: "Synthetic notice: duplicate cohort rows changed the reported effect size.",
        source: "Synthetic Correction Feed",
        scope: "effect-size table"
      },
      supportsClaimIds: ["C-318"]
    },
    {
      id: "REF-PREPRINT-SUPERSEDED",
      title: "Benchmark split proposal for perturbation recovery models",
      doi: "10.5555/synthetic.preprint.2024.102",
      year: 2024,
      source: "Synthetic Preprint Server",
      status: "superseded_preprint",
      evidenceRole: "supporting",
      replacement: {
        doi: "10.5555/synthetic.benchmark.2026.009",
        title: "Final benchmark split for perturbation recovery models",
        date: "2026-03-11"
      },
      notice: {
        type: "superseded_preprint",
        date: "2026-03-11",
        reason: "Synthetic notice: final publication changed exclusion criteria and benchmark folds.",
        source: "Synthetic Cross-Publication Linker",
        scope: "benchmark protocol"
      },
      supportsClaimIds: ["C-402"]
    },
    {
      id: "REF-ATLAS-ACTIVE",
      title: "Microglia enhancer atlas with validated perturbation controls",
      doi: "10.5555/synthetic.atlas.2025.011",
      year: 2025,
      source: "Synthetic Genomics Methods",
      status: "active",
      evidenceRole: "supporting",
      supportsClaimIds: ["C-101"]
    },
    {
      id: "REF-PIPELINE-ACTIVE",
      title: "Reproducible notebooks for perturbation recovery pipelines",
      doi: "10.5555/synthetic.pipeline.2025.033",
      year: 2025,
      source: "Synthetic Computational Protocols",
      status: "active",
      evidenceRole: "supporting",
      supportsClaimIds: ["C-204"]
    }
  ]
};

module.exports = { sampleProject };
