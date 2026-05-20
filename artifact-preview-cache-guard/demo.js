"use strict"

const { assessArtifactPreviews } = require("./index")

const result = assessArtifactPreviews({
  artifacts: [
    {
      id: "dose-response-csv",
      path: "data/dose-response.csv",
      version: "v3",
      hash: "sha256:333",
      schemaVersion: "v3",
      access: "public",
      metadata: {
        title: "Dose response measurements",
        license: "CC-BY-4.0",
        creators: ["North Lab"],
        doi: "10.1234/scibase.demo",
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
    {
      id: "participant-roster",
      path: "data/participants.csv",
      version: "v1",
      hash: "sha256:111",
      schemaVersion: "v1",
      access: "restricted",
      metadata: {
        title: "Participant roster",
        license: "DUA-required",
        creators: ["Clinic Lab"],
        columns: ["participant_id", "email", "cohort"],
      },
      preview: {
        kind: "table",
        generatedFromHash: "sha256:111",
        generatedFromVersion: "v1",
        schemaVersion: "v1",
        metadataDigest: "old",
        redactedFields: ["participant_id"],
      },
    },
  ],
})

console.log("Artifact Preview Cache Guard Demo")
console.log("=================================")
console.log(`status: ${result.status}`)
console.log(`artifacts checked: ${result.artifactCount}`)
console.log(`refresh count: ${result.refreshCount}`)
console.log(`blocked count: ${result.blockedCount}`)
console.log(`first plan: ${result.previewPlan[0].action}`)
console.log(`first diff added: ${result.artifacts[0].diffSummary.addedColumns.join(", ")}`)
console.log(`blocked reason: ${result.previewPlan[1].reason}`)
console.log(`digest: ${result.auditDigest.slice(0, 16)}...`)
