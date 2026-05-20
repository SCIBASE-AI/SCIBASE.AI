"use strict"

const { evaluateProjectArchiveHandoff } = require("./index")

const result = evaluateProjectArchiveHandoff({
  now: "2026-05-20T10:00:00.000Z",
  project: {
    id: "project-microbiome-atlas",
    title: "Microbiome Atlas Replication Study",
    visibility: "institutional-only",
  },
  members: [
    { id: "owner-1", role: "owner", status: "active", relationship: "institutional_member" },
    { id: "admin-1", role: "admin", status: "active", relationship: "institutional_member" },
    { id: "ext-reviewer", role: "reviewer", status: "active", relationship: "external_reviewer" },
  ],
  accessGrants: [
    {
      id: "grant-ext-download",
      memberId: "ext-reviewer",
      scopes: ["read", "download"],
      expiresAt: "2026-06-01T00:00:00.000Z",
    },
  ],
  artifacts: [
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
  ],
  discussions: [],
  archiveRequest: {
    actorId: "owner-1",
    nextOwnerId: "admin-1",
    archiveAt: "2026-05-22T00:00:00.000Z",
    visibilityAfterArchive: "institutional-only",
    autoRevokeExternalAccess: true,
  },
})

console.log("Project Archive Handoff Guard Demo")
console.log("===================================")
console.log(`status: ${result.status}`)
console.log(`archive mode: ${result.archiveMode}`)
console.log(`next owner: ${result.nextOwnerId}`)
console.log(`revocations: ${result.revocations.join(", ") || "none"}`)
console.log(`frozen artifacts: ${result.actions.find((action) => action.type === "freeze_project_objects").objectIds.length}`)
console.log(`citation artifacts: ${result.citationSnapshot.artifactCount}`)
console.log(`audit event: ${result.auditEvent.type}`)
console.log(`policy fingerprint: ${result.policyFingerprint.slice(0, 16)}...`)
