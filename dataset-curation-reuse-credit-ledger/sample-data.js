const assets = [
  {
    id: "dataset-cell-42",
    title: "Single-cell assay benchmark",
    type: "dataset",
    license: "CC-BY-4.0",
    maintainers: [
      { userId: "u-alina", role: "curator", share: 0.7 },
      { userId: "u-minh", role: "validator", share: 0.3 },
    ],
  },
  {
    id: "code-qc-7",
    title: "QC pipeline",
    type: "code",
    license: "MIT",
    maintainers: [{ userId: "u-minh", role: "maintainer", share: 1 }],
  },
];

const reuseEvents = [
  {
    id: "reuse-1",
    assetId: "dataset-cell-42",
    reuserId: "u-labwest",
    projectId: "paper-9",
    citation: "DOI:10.1000/cell42",
    licenseUsed: "CC-BY-4.0",
    evidenceHash: "sha256:evidence-1",
    validationStatus: "replicated",
  },
  {
    id: "reuse-2",
    assetId: "dataset-cell-42",
    reuserId: "u-alina",
    projectId: "paper-self",
    citation: "",
    licenseUsed: "CC0",
    evidenceHash: "sha256:evidence-1",
    validationStatus: "unverified",
  },
  {
    id: "reuse-3",
    assetId: "code-qc-7",
    reuserId: "u-labwest",
    projectId: "paper-10",
    citation: "GitHub release v1.4",
    licenseUsed: "MIT",
    evidenceHash: "sha256:evidence-3",
    validationStatus: "validated",
  },
];

module.exports = { assets, reuseEvents };
