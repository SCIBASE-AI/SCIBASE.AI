"use strict"

const assert = require("node:assert/strict")
const { evaluateProjectArchiveHandoff } = require("./index")

const baseProject = {
  id: "project-microbiome-atlas",
  title: "Microbiome Atlas Replication Study",
  visibility: "institutional-only",
}

const baseMembers = [
  { id: "owner-1", role: "owner", status: "active", relationship: "institutional_member" },
  { id: "admin-1", role: "admin", status: "active", relationship: "institutional_member" },
  { id: "ext-reviewer", role: "reviewer", status: "active", relationship: "external_reviewer" },
  { id: "viewer-1", role: "viewer", status: "active", relationship: "member" },
]

const baseArtifacts = [
  {
    id: "manuscript-v3",
    type: "manuscript",
    title: "Replication Manuscript",
    checksum: "sha256-manuscript",
    ownerId: "owner-1",
    doi: "10.1000/scibase.demo",
    version: "v3",
  },
  {
    id: "dataset-clean",
    type: "dataset",
    title: "Cleaned microbiome table",
    checksum: "sha256-dataset",
    ownerId: "admin-1",
    version: "2026.05",
  },
  {
    id: "analysis-code",
    type: "code",
    title: "Notebook and scripts",
    checksum: "sha256-code",
    ownerId: "owner-1",
    version: "main@abc123",
  },
]

function evaluate(overrides = {}) {
  return evaluateProjectArchiveHandoff({
    project: baseProject,
    members: baseMembers,
    artifacts: baseArtifacts,
    accessGrants: [],
    discussions: [],
    archiveRequest: {
      actorId: "owner-1",
      nextOwnerId: "admin-1",
      archiveAt: "2026-05-22T00:00:00.000Z",
      visibilityAfterArchive: "institutional-only",
      autoRevokeExternalAccess: true,
    },
    now: "2026-05-20T10:00:00.000Z",
    ...overrides,
  })
}

{
  const result = evaluate({
    accessGrants: [
      {
        id: "grant-external-download",
        memberId: "ext-reviewer",
        scopes: ["read", "download"],
        expiresAt: "2026-06-01T00:00:00.000Z",
      },
      {
        id: "grant-internal-read",
        memberId: "viewer-1",
        scopes: ["read"],
        expiresAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  })

  assert.equal(result.status, "ready")
  assert.deepEqual(result.revocations, ["grant-external-download"])
  assert.deepEqual(result.preservedGrants, ["grant-internal-read"])
  assert.equal(result.nextOwnerId, "admin-1")
  assert.equal(result.citationSnapshot.artifactCount, 3)
  assert.equal(result.auditEvent.type, "project.archive_handoff.evaluated")
  assert.match(result.policyFingerprint, /^[0-9a-f]{64}$/)
}

{
  const result = evaluate({
    archiveRequest: {
      actorId: "viewer-1",
      nextOwnerId: "ext-reviewer",
      archiveAt: "2026-05-22T00:00:00.000Z",
      autoRevokeExternalAccess: false,
    },
    accessGrants: [
      {
        id: "grant-ext-write",
        memberId: "ext-reviewer",
        scopes: ["read", "write"],
        expiresAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  })

  assert.equal(result.status, "blocked")
  assert.ok(result.blockers.includes("archive requester must be an active owner or admin"))
  assert.ok(result.blockers.includes("external grant grant-ext-write must be revoked or made read-only before archive"))
  assert.equal(result.archiveMode, "manual_review")
}

{
  const result = evaluate({
    artifacts: [
      ...baseArtifacts.slice(0, 2),
      {
        id: "analysis-code",
        type: "code",
        title: "Notebook and scripts",
        ownerId: "owner-1",
        version: "main@abc123",
      },
    ],
    discussions: [{ id: "thread-7", status: "open", blockingArchive: true }],
  })

  assert.equal(result.status, "blocked")
  assert.ok(result.blockers.includes("required artifact analysis-code is missing checksum or owner attribution"))
  assert.equal(result.warnings[0], "1 blocking discussion thread(s) should be resolved before archive")
}

console.log("project-archive-handoff-guard tests passed")
