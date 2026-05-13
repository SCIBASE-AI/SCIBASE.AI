export const sampleProject = {
  id: "organoid-crispr-response",
  title: "CRISPR perturbation response in patient-derived organoids",
  domain: "molecular-biology",
  abstract:
    "We study CRISPR perturbation response in patient-derived organoids using single-cell RNA sequencing and viability assays.",
  sections: {
    introduction:
      "Organoid models can preserve disease heterogeneity. Prior studies show mixed reproducibility across perturbation screens.",
    methods:
      "We processed 42 organoid lines, used randomized guide allocation, report reagent lots, and provide a Snakemake workflow.",
    results:
      "Perturbation A reduced resistant cell states in 31 of 42 lines. Results include confidence intervals but omit effect sizes for the validation cohort.",
    discussion:
      "The approach may guide therapeutic strategy, although the validation cohort remains small and follow-up studies are needed.",
    limitations:
      "The cohort is enriched for one clinical subtype and the public dataset lacks two raw microscopy channels."
  },
  claims: [
    {
      text: "Perturbation A is a therapeutic strategy for resistant tumors.",
      evidenceIds: ["fig-2", "table-1"],
      strength: "high"
    },
    {
      text: "Single-cell signatures replicate across patient-derived lines.",
      evidenceIds: ["fig-3", "notebook-qc"],
      strength: "moderate"
    }
  ],
  citationsBySection: {
    introduction: 12,
    methods: 4,
    results: 0,
    discussion: 5
  },
  artifacts: [
    { id: "raw-counts", type: "dataset", uri: "s3://scibase-demo/organoid/raw-counts", present: true },
    { id: "metadata", type: "dataset", uri: "s3://scibase-demo/organoid/metadata.csv", present: true },
    { id: "workflow", type: "code", uri: "workflows/reproduce.smk", present: true },
    { id: "validation-images", type: "dataset", uri: "s3://scibase-demo/organoid/images", present: false }
  ],
  environment: {
    manager: "conda",
    locked: true,
    files: ["environment.yml", "renv.lock"],
    containers: ["ghcr.io/scibase/organoid:2026-05"]
  },
  reproducibility: {
    commands: ["snakemake --cores 4 reproduce", "Rscript analysis/validate_effects.R"],
    deterministicSeeds: [1042, 1043],
    expectedOutputs: [
      { id: "figure-2", checksum: "sha256:3b2c", present: true },
      { id: "table-1", checksum: "sha256:ac7d", present: true },
      { id: "validation-microscopy", checksum: "sha256:missing", present: false }
    ],
    priorAttempts: [
      { date: "2026-04-17", actor: "internal-qc", status: "passed", evidence: "reports/internal-qc.md" },
      { date: "2026-04-26", actor: "external-reviewer-a", status: "warning", evidence: "reports/external-warning.md" }
    ]
  }
};

export const sampleCorpus = [
  {
    id: "gap-crispr-organoid-replication",
    title: "CRISPR organoid perturbation replication across clinical subtypes",
    topics: ["CRISPR", "organoid", "single-cell", "replication"],
    citations: 118,
    replicationCount: 1,
    unresolvedQuestions: [
      "Do single-cell perturbation signatures replicate outside subtype-enriched cohorts?",
      "Which microscopy channels are necessary for validation?"
    ],
    negativeResults: ["Two validation channels missing from public releases"],
    requiredCapabilities: ["single-cell RNA-seq", "organoid culture", "workflow automation"]
  },
  {
    id: "gap-qc-thresholds",
    title: "Shared QC thresholds for perturbation response studies",
    topics: ["single-cell", "quality-control", "benchmarking"],
    citations: 64,
    replicationCount: 0,
    unresolvedQuestions: ["Which QC thresholds best predict reproducible perturbation effects?"],
    negativeResults: [],
    requiredCapabilities: ["single-cell RNA-seq", "statistics"]
  },
  {
    id: "gap-clinical-trial-linkage",
    title: "Linking organoid perturbation results to early clinical-trial endpoints",
    topics: ["organoid", "clinical-trials", "translation"],
    citations: 41,
    replicationCount: 3,
    unresolvedQuestions: ["Which preclinical endpoints translate to progression-free survival?"],
    negativeResults: ["Weak correlation in retrospective cohorts"],
    requiredCapabilities: ["clinical data", "biostatistics"]
  }
];

export const researcherProfile = {
  interests: ["CRISPR", "organoid", "single-cell", "reproducibility"],
  labCapabilities: ["single-cell RNA-seq", "organoid culture", "workflow automation", "statistics"],
  projectHistory: ["perturbation screens", "Snakemake workflows", "patient-derived models"]
};
