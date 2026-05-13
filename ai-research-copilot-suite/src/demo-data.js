export const demoProject = {
  id: "organoid-response-atlas",
  title: "Single-cell perturbation atlas for CRISPR-treated cortical organoids",
  domain: "molecular_biology",
  abstract:
    "We profile CRISPR perturbations in cortical organoids and report cell-type-specific stress responses using single-cell RNA sequencing.",
  manuscriptSections: [
    {
      name: "Introduction",
      text: "Organoid perturbation studies need clearer links between observed transcriptional signatures and disease-relevant mechanisms.",
      citations: ["10.1038/s41586-020-2649-2", "10.1016/j.cell.2021.03.020"],
    },
    {
      name: "Methods",
      text: "We processed three donor-derived organoid lines, applied two guide RNAs per target, and analyzed batch-corrected single-cell data.",
      citations: ["10.1038/nbt.3192"],
    },
    {
      name: "Results",
      text: "Perturbation A increased unfolded protein response markers in radial-glia-like cells. The strongest claims rely on two donor lines after QC.",
      citations: [],
    },
  ],
  claims: [
    {
      text: "Perturbation A consistently induces a stress response across cortical organoids.",
      evidenceIds: ["figure-2", "notebook-qc"],
    },
    {
      text: "The response is sufficient to nominate a therapeutic target.",
      evidenceIds: ["figure-4"],
    },
  ],
  artifacts: [
    {
      id: "raw-counts",
      type: "dataset",
      title: "Raw count matrix",
      format: "h5ad",
      hasChecksum: true,
      hasLicense: true,
    },
    {
      id: "notebook-qc",
      type: "notebook",
      title: "QC and clustering notebook",
      executable: true,
      deterministicSeed: 42,
      expectedOutputs: ["qc-metrics.csv", "cluster-plot.png"],
    },
    {
      id: "figure-2",
      type: "figure",
      title: "Differential expression heatmap",
      sourceArtifact: "notebook-qc",
    },
    {
      id: "environment",
      type: "environment",
      title: "Conda environment",
      pinnedDependencies: true,
      containerImage: "ghcr.io/scibase/organoid-atlas:sha-9a33",
    },
  ],
  ethics: {
    humanSubjects: false,
    consentStatement: true,
    dataUseStatement: true,
  },
  reproducibilityAttempts: [
    {
      actor: "internal-qc",
      date: "2026-04-17",
      status: "passed",
      evidence: "runs/2026-04-17-qc.json",
    },
    {
      actor: "external-reviewer-a",
      date: "2026-04-26",
      status: "warning",
      evidence: "reviews/reviewer-a-repro.md",
      note: "Batch correction changed two cluster assignments.",
    },
  ],
  researcherProfile: {
    interests: ["CRISPR", "organoids", "single-cell RNA-seq", "neurodevelopment"],
    labCapabilities: ["single-cell sequencing", "organoid culture", "CRISPR screens"],
    recentProjects: ["organoid stress atlas", "guide RNA QC"],
  },
};

export const seedCorpus = [
  {
    id: "gap-crispr-organoid-replication",
    title: "CRISPR organoid perturbation studies lack cross-lab replication",
    concepts: ["CRISPR", "organoids", "replication"],
    citationCount: 164,
    replicationCount: 1,
    unresolvedQuestions: [
      "Do stress signatures replicate across organoid protocols?",
      "Which guide design factors explain divergent phenotypes?",
    ],
    negativeResults: ["No consistent response in two low-coverage donor lines."],
  },
  {
    id: "gap-single-cell-quality",
    title: "Single-cell QC thresholds are underreported in disease organoid papers",
    concepts: ["single-cell RNA-seq", "quality control", "organoids"],
    citationCount: 91,
    replicationCount: 0,
    unresolvedQuestions: ["Can a shared QC benchmark reduce false perturbation signals?"],
    negativeResults: [],
  },
  {
    id: "gap-therapeutic-target",
    title: "Therapeutic target nomination from in-vitro organoids needs orthogonal validation",
    concepts: ["therapeutic target", "organoids", "validation"],
    citationCount: 213,
    replicationCount: 2,
    unresolvedQuestions: ["Which orthogonal assays best validate organoid-derived targets?"],
    negativeResults: ["Several targets failed validation in mature neuron co-cultures."],
  },
];
