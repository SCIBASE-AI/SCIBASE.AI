const assert = require("node:assert/strict")
const { evaluateRestoreRehearsal } = require("./index")
const { repositories, policy } = require("./sample-data")

const packet = evaluateRestoreRehearsal({
  asOf: "2026-05-23T02:00:00.000Z",
  repositories,
  policy,
})

assert.equal(packet.summary.totalRepositories, 3)
assert.equal(packet.summary.readyRepositories, 1)
assert.equal(packet.summary.stewardReviewRepositories, 0)
assert.equal(packet.summary.heldRepositories, 2)
assert.equal(packet.summary.criticalFindings, 6)
assert.equal(packet.summary.warningFindings, 4)
assert.equal(packet.releaseQueue.length, 1)
assert.equal(packet.releaseQueue[0].repositoryId, "neuro-reproducibility-atlas")

const ready = packet.repositories.find((repository) => repository.repositoryId === "neuro-reproducibility-atlas")
assert.equal(ready.status, "restore_ready")
assert(ready.checks.every((check) => check.pass))
assert.equal(ready.restorePacket.candidateTag, "v1.2.0")

const climate = packet.repositories.find((repository) => repository.repositoryId === "climate-table-fork")
assert.equal(climate.status, "hold_restore_rehearsal")
assert(climate.findings.some((finding) => finding.code === "restore_drill_recent_passed"))
assert(climate.findings.some((finding) => finding.code === "ref_coverage"))
assert(climate.findings.some((finding) => finding.code === "component_manifest_integrity"))
assert(climate.findings.some((finding) => finding.code === "artifact_mirror_ready"))
assert(climate.findings.some((finding) => finding.code === "environment_lock_coverage"))

const climateManifest = climate.findings.find((finding) => finding.code === "component_manifest_integrity")
assert(climateManifest.evidence.failures.some((failure) => failure.reason === "hash_mismatch"))

const protein = packet.repositories.find((repository) => repository.repositoryId === "protein-model-sandbox")
assert.equal(protein.status, "hold_restore_rehearsal")
assert(protein.findings.some((finding) => finding.code === "snapshot_recency"))
assert(protein.findings.some((finding) => finding.code === "restore_drill_recent_passed"))
assert(protein.findings.some((finding) => finding.code === "notebook_replay_recent"))
assert(protein.findings.some((finding) => finding.code === "export_manifest_linked"))

const minimalReady = evaluateRestoreRehearsal({
  asOf: "2026-05-23T02:00:00.000Z",
  repositories: [{
    repositoryId: "minimal-ready",
    title: "Minimal Ready",
    releaseCandidate: {
      snapshotId: "snap-minimal",
      tag: "v1.0.0",
    },
    expectedComponents: [
      { component: "manuscript", hash: "sha256:a" },
      { component: "data", hash: "sha256:b" },
      { component: "code", hash: "sha256:c" },
      { component: "metadata", hash: "sha256:d" },
    ],
    snapshots: [{
      id: "snap-minimal",
      createdAt: "2026-05-22T02:00:00.000Z",
      refs: ["refs/heads/main"],
      tags: ["v1.0.0"],
      environmentLocks: {
        containerDigest: "sha256:container",
        dependencyLock: "package-lock.json@sha256:1",
      },
      exportManifest: {
        snapshotId: "snap-minimal",
      },
      artifacts: [
        { component: "manuscript", path: "manuscript/main.md", hash: "sha256:a" },
        { component: "data", path: "data/table.csv", hash: "sha256:b" },
        { component: "code", path: "code/analysis.py", hash: "sha256:c" },
        { component: "metadata", path: "metadata.json", hash: "sha256:d" },
      ],
    }],
    restoreDrills: [{
      id: "drill-minimal",
      snapshotId: "snap-minimal",
      status: "passed",
      completedAt: "2026-05-22T03:00:00.000Z",
    }],
  }],
  policy,
})
assert.equal(minimalReady.summary.readyRepositories, 1)
assert.equal(minimalReady.summary.totalFindings, 0)

const repeated = evaluateRestoreRehearsal({
  asOf: "2026-05-23T02:00:00.000Z",
  repositories,
  policy,
})
assert.equal(repeated.audit.digest, packet.audit.digest)

console.log("repository restore rehearsal guard tests passed")
