const artifactBatch = {
  id: "artifact-batch-2026-05-29",
  generatedAt: "2026-05-29T13:22:00.000Z",
  artifacts: [
    {
      id: "dataset-river-001",
      kind: "dataset",
      filename: "river-sediment-metals.csv",
      license: "CC-BY-4.0",
      checksum: "sha256:8b7f4c9d4c5a0f11",
      identifiers: ["doi:10.5555/river.001"],
      metadata: ["title", "creators", "publisher", "publicationYear", "resourceType", "schema.org", "keywords"],
      access: "public",
      sensitiveUseFlags: []
    },
    {
      id: "model-clinical-002",
      kind: "model",
      filename: "clinical-risk-model.bin",
      license: "proprietary",
      checksum: null,
      identifiers: [],
      metadata: ["title", "creators", "resourceType"],
      access: "public",
      sensitiveUseFlags: ["clinical-derived"]
    },
    {
      id: "code-analysis-003",
      kind: "code",
      filename: "run_analysis.py",
      license: "MIT",
      checksum: "sha256:12ab91ee77cafe44",
      identifiers: ["swh:1:cnt:123456"],
      metadata: ["title", "creators", "publisher", "publicationYear", "resourceType", "schema.org"],
      access: "public",
      sensitiveUseFlags: []
    },
    {
      id: "supplement-004",
      kind: "supplement",
      filename: "interview-notes-redacted.pdf",
      license: "CC0-1.0",
      checksum: "sha256:ca11ab1e0042",
      identifiers: ["doi:10.5555/supp.004"],
      metadata: ["title", "creators", "publisher", "publicationYear", "resourceType"],
      access: "restricted",
      sensitiveUseFlags: ["human-subjects"]
    }
  ]
};

module.exports = { artifactBatch };
