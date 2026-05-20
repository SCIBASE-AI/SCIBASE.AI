"use strict"

const crypto = require("node:crypto")

const EDIT_ROLES = new Set(["owner", "admin", "editor", "contributor"])

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex")
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? null : date
}

function collaboratorById(collaborators, id) {
  return collaborators.find((collaborator) => collaborator.id === id)
}

function canEdit(collaborator) {
  return Boolean(collaborator && collaborator.status === "active" && EDIT_ROLES.has(collaborator.role))
}

function compareDates(a, b) {
  return parseDate(a).valueOf() - parseDate(b).valueOf()
}

function evaluateCollabAutosaveRecovery(input) {
  const document = input.document || {}
  const collaborators = input.collaborators || []
  const autosaveEvents = [...(input.autosaveEvents || [])].sort((a, b) => compareDates(a.createdAt, b.createdAt))
  const localSnapshots = input.localSnapshots || []
  const namedVersions = input.namedVersions || []
  const restoreRequest = input.restoreRequest || {}
  const requestedAt = parseDate(input.now) || new Date()
  const blockers = []
  const warnings = []

  if (!document.id) blockers.push("document.id is required")
  if (!document.title) blockers.push("document.title is required")

  const actor = collaboratorById(collaborators, restoreRequest.actorId)
  if (!canEdit(actor)) {
    blockers.push("restore requester must be an active editor, contributor, admin, or owner")
  }

  const targetVersion = namedVersions.find((version) => version.id === restoreRequest.targetVersionId)
  if (!targetVersion) {
    blockers.push("restore target named version is required")
  } else if (!targetVersion.contentHash) {
    blockers.push(`named version ${targetVersion.id} is missing a content hash`)
  }

  const targetCreatedAt = targetVersion ? parseDate(targetVersion.createdAt) : null
  const restoreSections = new Set(restoreRequest.sections || (document.sections || []).map((section) => section.id))

  const lockedSections = (document.sections || []).filter(
    (section) =>
      restoreSections.has(section.id) &&
      section.lockedBy &&
      section.lockedBy !== restoreRequest.actorId &&
      actor?.role !== "admin" &&
      actor?.role !== "owner",
  )
  for (const section of lockedSections) {
    blockers.push(`section ${section.id} is locked by ${section.lockedBy}`)
  }

  const postVersionEvents =
    targetCreatedAt === null
      ? []
      : autosaveEvents.filter((event) => restoreSections.has(event.sectionId) && parseDate(event.createdAt) > targetCreatedAt)

  const conflictEvents = postVersionEvents.filter((event) => {
    if (event.userId === restoreRequest.actorId) return false
    const acknowledged = new Set(event.ackedBy || [])
    return !acknowledged.has(restoreRequest.actorId)
  })

  if (conflictEvents.length > 0 && !restoreRequest.allowBranchRestore) {
    blockers.push(`${conflictEvents.length} unacknowledged autosave event(s) would be overwritten`)
  } else if (conflictEvents.length > 0) {
    warnings.push(`${conflictEvents.length} unacknowledged autosave event(s) will be preserved in a branch restore`)
  }

  const latestRemoteBySection = new Map()
  for (const event of autosaveEvents) {
    latestRemoteBySection.set(event.sectionId, event)
  }

  const cacheMerges = localSnapshots
    .filter((snapshot) => restoreSections.has(snapshot.sectionId))
    .filter((snapshot) => {
      const remote = latestRemoteBySection.get(snapshot.sectionId)
      return !remote || parseDate(snapshot.createdAt) > parseDate(remote.createdAt)
    })
    .map((snapshot) => ({
      snapshotId: snapshot.id,
      sectionId: snapshot.sectionId,
      ownerId: snapshot.userId,
      contentHash: snapshot.contentHash,
    }))

  if (cacheMerges.length > 0) {
    warnings.push(`${cacheMerges.length} newer local cache snapshot(s) should be merged before final restore`)
  }

  const restorePlan = {
    documentId: document.id || null,
    targetVersionId: targetVersion ? targetVersion.id : null,
    mode: restoreRequest.allowBranchRestore ? "branch_restore" : "in_place_restore",
    sections: [...restoreSections],
    preserveEvents: conflictEvents.map((event) => event.id),
    mergeLocalSnapshots: cacheMerges.map((snapshot) => snapshot.snapshotId),
    resultingVersionLabel: restoreRequest.resultingVersionLabel || "Recovered draft",
  }

  const status = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "held" : "ready"
  const result = {
    documentId: document.id || null,
    requestedAt: requestedAt.toISOString(),
    status,
    blockers,
    warnings,
    restorePlan,
    conflictEventIds: conflictEvents.map((event) => event.id),
    cacheMerges,
    auditEvent: {
      type: "collab_editor.autosave_restore.evaluated",
      actorId: restoreRequest.actorId || null,
      documentId: document.id || null,
      status,
      targetVersionId: targetVersion ? targetVersion.id : null,
      at: requestedAt.toISOString(),
    },
  }

  return {
    ...result,
    recoveryFingerprint: digest({
      status,
      restorePlan,
      blockers,
      warnings,
      conflictEventIds: result.conflictEventIds,
      cacheMerges,
    }),
  }
}

module.exports = {
  evaluateCollabAutosaveRecovery,
}
