"use strict"

const assert = require("node:assert/strict")
const { evaluateCollabAutosaveRecovery } = require("./index")

const document = {
  id: "doc-manuscript-7",
  title: "Shared Methods Manuscript",
  sections: [
    { id: "intro" },
    { id: "methods" },
    { id: "figures", lockedBy: "review-lead" },
  ],
}

const collaborators = [
  { id: "owner-1", role: "owner", status: "active" },
  { id: "editor-1", role: "editor", status: "active" },
  { id: "review-lead", role: "contributor", status: "active" },
  { id: "viewer-1", role: "viewer", status: "active" },
]

const namedVersions = [
  {
    id: "version-submission-draft",
    label: "Submission Draft",
    createdAt: "2026-05-20T08:00:00.000Z",
    contentHash: "sha256-submission-draft",
  },
]

function evaluate(overrides = {}) {
  return evaluateCollabAutosaveRecovery({
    document,
    collaborators,
    namedVersions,
    autosaveEvents: [],
    localSnapshots: [],
    restoreRequest: {
      actorId: "owner-1",
      targetVersionId: "version-submission-draft",
      sections: ["intro", "methods"],
      resultingVersionLabel: "Recovered submission draft",
    },
    now: "2026-05-20T10:20:00.000Z",
    ...overrides,
  })
}

{
  const result = evaluate()
  assert.equal(result.status, "ready")
  assert.equal(result.restorePlan.mode, "in_place_restore")
  assert.deepEqual(result.restorePlan.sections, ["intro", "methods"])
  assert.deepEqual(result.conflictEventIds, [])
  assert.match(result.recoveryFingerprint, /^[0-9a-f]{64}$/)
}

{
  const result = evaluate({
    restoreRequest: {
      actorId: "viewer-1",
      targetVersionId: "version-submission-draft",
      sections: ["intro"],
    },
    autosaveEvents: [
      {
        id: "autosave-late-methods",
        userId: "editor-1",
        sectionId: "intro",
        contentHash: "sha256-late",
        createdAt: "2026-05-20T09:15:00.000Z",
        ackedBy: [],
      },
    ],
  })

  assert.equal(result.status, "blocked")
  assert.ok(result.blockers.includes("restore requester must be an active editor, contributor, admin, or owner"))
  assert.ok(result.blockers.includes("1 unacknowledged autosave event(s) would be overwritten"))
}

{
  const result = evaluate({
    restoreRequest: {
      actorId: "editor-1",
      targetVersionId: "version-submission-draft",
      sections: ["methods", "figures"],
      allowBranchRestore: true,
    },
    autosaveEvents: [
      {
        id: "autosave-review-lead-figures",
        userId: "review-lead",
        sectionId: "figures",
        contentHash: "sha256-figures-late",
        createdAt: "2026-05-20T09:10:00.000Z",
        ackedBy: [],
      },
    ],
    localSnapshots: [
      {
        id: "local-methods-cache",
        userId: "editor-1",
        sectionId: "methods",
        contentHash: "sha256-local-methods",
        createdAt: "2026-05-20T09:30:00.000Z",
      },
    ],
  })

  assert.equal(result.status, "blocked")
  assert.ok(result.blockers.includes("section figures is locked by review-lead"))
  assert.ok(result.warnings.includes("1 unacknowledged autosave event(s) will be preserved in a branch restore"))
  assert.ok(result.warnings.includes("1 newer local cache snapshot(s) should be merged before final restore"))
  assert.deepEqual(result.restorePlan.preserveEvents, ["autosave-review-lead-figures"])
  assert.deepEqual(result.restorePlan.mergeLocalSnapshots, ["local-methods-cache"])
}

console.log("collab-autosave-recovery tests passed")
