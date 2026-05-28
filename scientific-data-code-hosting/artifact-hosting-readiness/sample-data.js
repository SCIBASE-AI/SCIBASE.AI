const hostingPolicy = {
  reviewDate: "2026-05-28T00:00:00Z",
  maxFileBytes: 1000000,
  maxSandboxCpu: 8,
  maxSandboxMemoryGb: 32,
};

const riskyBundle = {
  id: "bundle-multimodal-assay-001",
  artifacts: [
    {
      path: "data/raw-assay.csv",
      type: "csv",
      category: "dataset",
      sha256: "",
      sizeBytes: 1200000,
      containsRestrictedData: true,
      preview: { schemaInferred: false },
      versioning: { diffEnabled: true },
    },
    {
      path: "code/train_model.py",
      type: "py",
      category: "code",
      sha256: "abc123",
      sizeBytes: 12000,
      containsRestrictedData: false,
      preview: {},
      versioning: { diffEnabled: false },
    },
    {
      path: "models/checkpoint.bin",
      type: "bin",
      category: "model",
      sha256: "def456",
      sizeBytes: 800000,
      containsRestrictedData: false,
      preview: {},
      versioning: { diffEnabled: false },
    },
  ],
  metadata: {
    identifier: "",
    license: "",
    datacite: false,
    jsonLd: true,
    schemaOrg: false,
    keywords: [],
    variables: [],
  },
  access: {
    visibility: "public",
    authorizedGroups: [],
    auditLogging: false,
  },
  runtime: {
    containerImage: "",
    environmentFile: "",
    sandboxed: false,
    sandboxLimits: { cpu: 16, memoryGb: 64 },
    reproducibilityTrigger: {},
  },
  versioning: {
    currentVersion: "first-release",
    diffManifestPath: "",
    rollbackCheckpoint: "",
  },
};

const readyBundle = {
  id: "bundle-catalyst-reuse-042",
  artifacts: [
    {
      path: "data/cleaned-yields.parquet",
      type: "parquet",
      category: "dataset",
      sha256: "d1",
      sizeBytes: 320000,
      containsRestrictedData: false,
      preview: { schemaInferred: true },
      versioning: { diffEnabled: true },
    },
    {
      path: "code/analyze.py",
      type: "py",
      category: "code",
      sha256: "d2",
      sizeBytes: 18000,
      containsRestrictedData: false,
      preview: {},
      versioning: { diffEnabled: true },
    },
    {
      path: "notebooks/reproduce.ipynb",
      type: "ipynb",
      category: "notebook",
      sha256: "d3",
      sizeBytes: 48000,
      containsRestrictedData: false,
      preview: { schemaInferred: true },
      versioning: { diffEnabled: true },
    },
  ],
  metadata: {
    identifier: "doi:10.1234/scibase.synthetic.14",
    license: "CC-BY-4.0",
    datacite: true,
    jsonLd: true,
    schemaOrg: true,
    keywords: ["catalysis", "flow chemistry"],
    variables: ["yield", "temperature", "residence_time"],
  },
  access: {
    visibility: "public",
    authorizedGroups: ["public"],
    auditLogging: true,
  },
  runtime: {
    containerImage: "ghcr.io/scibase/synthetic-artifacts:v1.0.0",
    environmentFile: "",
    sandboxed: true,
    sandboxLimits: { cpu: 4, memoryGb: 16 },
    reproducibilityTrigger: { path: "notebooks/reproduce.ipynb" },
  },
  versioning: {
    currentVersion: "v1.0.0",
    diffManifestPath: "metadata/diff-v1.0.0.json",
    rollbackCheckpoint: "checkpoint:v0.9.0",
  },
};

module.exports = {
  hostingPolicy,
  readyBundle,
  riskyBundle,
};
