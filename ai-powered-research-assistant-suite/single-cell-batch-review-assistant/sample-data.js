const samplePacket = {
  studyId: "scrna-neuroinflammation-2026",
  title: "Synthetic Single-Cell Neuroinflammation Manuscript",
  experimentalDesign: {
    assay: "10x scRNA-seq",
    tissue: "synthetic human cortical organoid atlas",
    donorsByCondition: {
      control: 1,
      disease: 2,
    },
  },
  samples: [
    { id: "ctrl-01", condition: "control", donorId: "D-001", batch: "chem-v2-day1", cells: 2600, doubletDetectionRun: false, doubletRate: 0.12 },
    { id: "case-01", condition: "disease", donorId: "D-101", batch: "chem-v3-day9", cells: 4100, doubletDetectionRun: true, doubletRate: 0.11 },
    { id: "case-02", condition: "disease", donorId: "D-102", batch: "chem-v3-day9", cells: 3900, doubletDetectionRun: true, doubletRate: 0.06 },
  ],
  batchDesign: [
    {
      id: "library-chemistry",
      variable: "10x chemistry and run day",
      conditionCounts: { control: 1, disease: 2 },
      conditionAssociation: 0.91,
      sampleIds: ["ctrl-01", "case-01", "case-02"],
    },
    {
      id: "sequencing-lane",
      variable: "lane",
      conditionCounts: { control: 0, disease: 2 },
      conditionAssociation: 1,
      sampleIds: ["case-01", "case-02"],
    },
  ],
  analysisPlan: {
    integrationMethod: "Harmony",
    deModel: "cell_level_wilcoxon",
    usesPseudobulk: false,
    randomEffect: null,
    fdrMethod: "Benjamini-Hochberg",
  },
  integration: {
    used: true,
    method: "Harmony",
    expressionUsedForDE: true,
    conditionPreservationDiagnostic: false,
    silhouetteDelta: -0.34,
  },
  qualityControl: {
    mitochondrialMax: 0.25,
    minGenes: 200,
  },
  ambientRna: {
    estimatedContamination: 0.14,
    correctionRun: false,
    affectedMarkers: ["C1QA", "LYZ", "MALAT1"],
  },
  cellTypeAnnotations: [
    {
      clusterId: "c7",
      label: "novel inflammatory microglia",
      positiveMarkerSupport: 0.46,
      negativeMarkerSupport: 0.32,
      ambiguousLabel: true,
      topMarkers: ["C1QA", "LYZ", "MALAT1"],
    },
    {
      clusterId: "c2",
      label: "excitatory neurons",
      positiveMarkerSupport: 0.82,
      negativeMarkerSupport: 0.71,
      ambiguousLabel: false,
      topMarkers: ["SLC17A7", "SATB2", "FOXG1"],
    },
  ],
  clusterStability: [
    { clusterId: "c7", label: "novel inflammatory microglia", bootstrapJaccard: 0.41, resolutionConsistency: 0.48 },
    { clusterId: "c2", label: "excitatory neurons", bootstrapJaccard: 0.82, resolutionConsistency: 0.79 },
  ],
  claims: [
    {
      id: "claim-c7-disease-driver",
      strength: "strong",
      text: "A novel inflammatory microglia state drives disease and is differentially expressed in the patient condition.",
      evidenceIds: ["ev-cell-level-de", "ev-marker-c7"],
    },
    {
      id: "claim-c2-control",
      strength: "moderate",
      text: "Excitatory neuron proportions are stable across the synthetic samples.",
      evidenceIds: ["ev-cluster-c2"],
    },
  ],
  evidenceItems: [
    {
      id: "ev-cell-level-de",
      type: "cell_level_de",
      method: "Wilcoxon rank-sum over cells",
      fdr: 0.001,
      logFoldChange: 0.74,
    },
    {
      id: "ev-marker-c7",
      type: "marker_panel",
      markers: ["C1QA", "LYZ", "MALAT1"],
      negativeMarkers: [],
    },
    {
      id: "ev-cluster-c2",
      type: "cluster_stability",
      bootstrapJaccard: 0.82,
    },
  ],
  reproducibility: {
    rawMatrixAccession: "",
    analysisCodeAvailable: false,
    pipelineVersion: "",
    randomSeed: null,
    parameterDigest: "",
    packageLockDigest: "",
  },
};

module.exports = { samplePacket };
