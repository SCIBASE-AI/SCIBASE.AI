"use strict"

const assert = require("node:assert/strict")
const { assessArtifactPreviews } = require("./index")

const currentMetadata = {
  title: "Dose response measurements",
  license: "CC-BY-4.0",
  creators: ["North Lab"],
  doi: "10.1234/scibase.demo",
  columns: ["sample_id", "dose", "response"],
  schemaVersion: "v2",
}

{
  const metadataDigest = require("node:crypto")
    .createHash("sha256")
    .update(
      '{"columns":["sample_id","dose","response"],"creators":["North Lab"],"doi":"10.1234/scibase.demo","license":"CC-BY-4.0","schemaVersion":"v2","title":"Dose response measurements"}',
    )
    .digest("hex")

  const result = assessArtifactPreviews({
    artifacts: [
      {
        id: "artifact-ready",
        path: "data/dose-response.csv",
        version: "v2",
        hash: "sha256:222",
        schemaVersion: "v2",
        access: "public",
        metadata: currentMetadata,
        preview: {
          kind: "table",
          generatedFromHash: "sha256:222",
          generatedFromVersion: "v2",
          schemaVersion: "v2",
          metadataDigest,
        },
      },
    ],
  })

  assert.equal(result.status, "ready")
  assert.equal(result.refreshCount, 0)
  assert.equal(result.previewPlan[0].action, "reuse-preview")
  assert.match(result.auditDigest, /^[0-9a-f]{64}$/)
}

{
  const result = assessArtifactPreviews({
    artifacts: [
      {
        id: "artifact-stale",
        path: "data/results.csv",
        version: "v3",
        hash: "sha256:333",
        schemaVersion: "v3",
        access: "public",
        metadata: {
          title: "Updated measurements",
          license: "CC-BY-4.0",
          creators: ["North Lab"],
          doi: "10.1234/scibase.updated",
          columns: ["sample_id", "dose", "response", "batch"],
        },
        previousVersion: {
          hash: "sha256:222",
          metadata: { columns: ["sample_id", "dose", "response"] },
        },
        preview: {
          kind: "table",
          generatedFromHash: "sha256:222",
          generatedFromVersion: "v2",
          schemaVersion: "v2",
          metadataDigest: "old",
        },
      },
    ],
  })

  assert.equal(result.status, "needs-refresh")
  assert.equal(result.refreshCount, 1)
  assert.ok(result.artifacts[0].refreshReasons.includes("preview content hash is stale"))
  assert.deepEqual(result.artifacts[0].diffSummary.addedColumns, ["batch"])
}

{
  const result = assessArtifactPreviews({
    artifacts: [
      {
        id: "artifact-sensitive",
        path: "data/participants.csv",
        version: "v1",
        hash: "sha256:111",
        schemaVersion: "v1",
        access: "restricted",
        metadata: {
          title: "Participant metadata",
          license: "DUA-required",
          creators: ["Clinic Lab"],
          columns: ["participant_id", "email", "cohort"],
        },
        preview: {
          kind: "table",
          generatedFromHash: "sha256:111",
          generatedFromVersion: "v1",
          schemaVersion: "v1",
          metadataDigest: "stale",
          redactedFields: ["participant_id"],
        },
      },
    ],
  })

  assert.equal(result.status, "blocked")
  assert.equal(result.blockedCount, 1)
  assert.ok(result.previewPlan[0].reason.includes("email"))
}

{
  const result = assessArtifactPreviews({
    artifacts: [
      {
        id: "artifact-metadata-warning",
        path: "notebooks/analysis.ipynb",
        version: "v1",
        hash: "sha256:notebook",
        schemaVersion: "v1",
        access: "private",
        metadata: { title: "Notebook preview", columns: [] },
        preview: {
          kind: "notebook-or-code",
          generatedFromHash: "sha256:notebook",
          generatedFromVersion: "v1",
          schemaVersion: "v1",
          metadataDigest: "old",
        },
      },
    ],
  })

  assert.equal(result.status, "needs-refresh")
  assert.ok(result.fairWarnings.some((item) => item.warning.includes("license")))
  assert.ok(result.fairWarnings.some((item) => item.warning.includes("creators")))
}

console.log("artifact-preview-cache-guard tests passed")
