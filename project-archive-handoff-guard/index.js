"use strict"

const crypto = require("node:crypto")

const WRITE_ROLES = new Set(["owner", "admin", "contributor"])
const ARCHIVE_ROLES = new Set(["owner", "admin"])
const INTERNAL_RELATIONSHIPS = new Set(["member", "employee", "institutional_member"])
const REQUIRED_ARTIFACT_TYPES = new Set(["manuscript", "dataset", "code"])

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }
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

function parseDate(value, fallback) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return fallback
  return date
}

function isActive(member) {
  return member.status === "active"
}

function isInternal(member) {
  return INTERNAL_RELATIONSHIPS.has(member.relationship || "member")
}

function memberById(members, id) {
  return members.find((member) => member.id === id)
}

function canArchive(member) {
  return Boolean(member && isActive(member) && ARCHIVE_ROLES.has(member.role))
}

function canOwnArchivedProject(member) {
  return Boolean(member && isActive(member) && isInternal(member) && ARCHIVE_ROLES.has(member.role))
}

function hasWriteOrDownloadScope(grant) {
  const scopes = new Set(grant.scopes || [])
  return scopes.has("write") || scopes.has("download") || scopes.has("admin")
}

function buildCitationSnapshot(project, artifacts, requestedAt) {
  const citationArtifacts = artifacts
    .filter((artifact) => artifact.includeInCitation !== false)
    .map((artifact) => ({
      id: artifact.id,
      type: artifact.type,
      title: artifact.title || artifact.id,
      checksum: artifact.checksum || null,
      doi: artifact.doi || null,
      version: artifact.version || "unversioned",
    }))

  return {
    projectId: project.id,
    projectTitle: project.title,
    generatedAt: requestedAt.toISOString(),
    artifactCount: citationArtifacts.length,
    artifacts: citationArtifacts,
    fingerprint: digest(citationArtifacts),
  }
}

function evaluateProjectArchiveHandoff(input) {
  const requestedAt = parseDate(input.now, new Date())
  const project = input.project || {}
  const members = input.members || []
  const accessGrants = input.accessGrants || []
  const artifacts = input.artifacts || []
  const archiveRequest = input.archiveRequest || {}
  const blockers = []
  const warnings = []
  const actions = []

  if (!project.id) blockers.push("project.id is required")
  if (!project.title) blockers.push("project.title is required")

  const actor = memberById(members, archiveRequest.actorId)
  if (!canArchive(actor)) {
    blockers.push("archive requester must be an active owner or admin")
  }

  const requestedNextOwner = memberById(members, archiveRequest.nextOwnerId)
  const fallbackOwner = members.find((member) => canOwnArchivedProject(member))
  const nextOwner = canOwnArchivedProject(requestedNextOwner) ? requestedNextOwner : fallbackOwner

  if (!nextOwner) {
    blockers.push("archived project needs an active internal owner or admin handoff target")
  }

  const requiredArtifacts = artifacts.filter((artifact) => REQUIRED_ARTIFACT_TYPES.has(artifact.type))
  const incompleteArtifacts = requiredArtifacts.filter((artifact) => !artifact.checksum || !artifact.ownerId)
  for (const artifact of incompleteArtifacts) {
    blockers.push(`required artifact ${artifact.id} is missing checksum or owner attribution`)
  }

  const cutoff = parseDate(archiveRequest.archiveAt, requestedAt)
  const autoRevoke = archiveRequest.autoRevokeExternalAccess !== false
  const revocations = []
  const preservedGrants = []

  for (const grant of accessGrants) {
    const grantee = memberById(members, grant.memberId)
    const expiresAt = parseDate(grant.expiresAt, null)
    const stillActiveAtArchive = !expiresAt || expiresAt > cutoff
    const external = !grantee || !isInternal(grantee)

    if (external && stillActiveAtArchive && hasWriteOrDownloadScope(grant)) {
      if (autoRevoke) {
        revocations.push(grant.id)
        actions.push({
          type: "revoke_external_access",
          grantId: grant.id,
          reason: "external write/download access cannot survive archive",
        })
      } else {
        blockers.push(`external grant ${grant.id} must be revoked or made read-only before archive`)
      }
    } else if (stillActiveAtArchive) {
      preservedGrants.push(grant.id)
    }
  }

  const openBlockingThreads = (input.discussions || []).filter(
    (thread) => thread.status !== "resolved" && thread.blockingArchive === true,
  )
  if (openBlockingThreads.length > 0) {
    warnings.push(`${openBlockingThreads.length} blocking discussion thread(s) should be resolved before archive`)
  }

  const citationSnapshot = buildCitationSnapshot(project, artifacts, requestedAt)
  const freezeObjects = artifacts.map((artifact) => artifact.id)
  actions.push({
    type: "freeze_project_objects",
    objectIds: freezeObjects,
    reason: "archive mode makes project artifacts read-only",
  })
  actions.push({
    type: "handoff_owner",
    fromMemberId: actor ? actor.id : null,
    toMemberId: nextOwner ? nextOwner.id : null,
  })
  actions.push({
    type: "write_citation_snapshot",
    fingerprint: citationSnapshot.fingerprint,
  })

  const status = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "held" : "ready"
  const result = {
    projectId: project.id || null,
    requestedAt: requestedAt.toISOString(),
    status,
    archiveMode: status === "blocked" ? "manual_review" : "read_only_archive",
    nextOwnerId: nextOwner ? nextOwner.id : null,
    visibilityAfterArchive: archiveRequest.visibilityAfterArchive || project.visibility || "private",
    blockers,
    warnings,
    revocations,
    preservedGrants,
    actions,
    citationSnapshot,
    auditEvent: {
      type: "project.archive_handoff.evaluated",
      actorId: actor ? actor.id : archiveRequest.actorId || null,
      projectId: project.id || null,
      status,
      nextOwnerId: nextOwner ? nextOwner.id : null,
      at: requestedAt.toISOString(),
    },
  }

  return {
    ...result,
    policyFingerprint: digest({
      projectId: result.projectId,
      status: result.status,
      nextOwnerId: result.nextOwnerId,
      blockers: result.blockers,
      warnings: result.warnings,
      revocations: result.revocations,
      citationFingerprint: result.citationSnapshot.fingerprint,
    }),
  }
}

module.exports = {
  evaluateProjectArchiveHandoff,
}
