"use strict"

const { evaluateCollabAutosaveRecovery } = require("./index")

const result = evaluateCollabAutosaveRecovery({
  now: "2026-05-20T10:20:00.000Z",
  document: {
    id: "doc-manuscript-7",
    title: "Shared Methods Manuscript",
    sections: [{ id: "intro" }, { id: "methods" }, { id: "figures" }],
  },
  collaborators: [
    { id: "owner-1", role: "owner", status: "active" },
    { id: "editor-1", role: "editor", status: "active" },
  ],
  namedVersions: [
    {
      id: "version-submission-draft",
      label: "Submission Draft",
      createdAt: "2026-05-20T08:00:00.000Z",
      contentHash: "sha256-submission-draft",
    },
  ],
  autosaveEvents: [
    {
      id: "autosave-editor-methods",
      userId: "editor-1",
      sectionId: "methods",
      contentHash: "sha256-methods-late",
      createdAt: "2026-05-20T09:10:00.000Z",
      ackedBy: ["owner-1"],
    },
  ],
  localSnapshots: [
    {
      id: "local-intro-cache",
      userId: "owner-1",
      sectionId: "intro",
      contentHash: "sha256-local-intro",
      createdAt: "2026-05-20T09:30:00.000Z",
    },
  ],
  restoreRequest: {
    actorId: "owner-1",
    targetVersionId: "version-submission-draft",
    sections: ["intro", "methods"],
    resultingVersionLabel: "Recovered submission draft",
  },
})

console.log("Collaborative Autosave Recovery Demo")
console.log("====================================")
console.log(`status: ${result.status}`)
console.log(`restore mode: ${result.restorePlan.mode}`)
console.log(`target version: ${result.restorePlan.targetVersionId}`)
console.log(`sections: ${result.restorePlan.sections.join(", ")}`)
console.log(`local cache merges: ${result.restorePlan.mergeLocalSnapshots.join(", ") || "none"}`)
console.log(`conflict events: ${result.conflictEventIds.join(", ") || "none"}`)
console.log(`audit event: ${result.auditEvent.type}`)
console.log(`recovery fingerprint: ${result.recoveryFingerprint.slice(0, 16)}...`)
