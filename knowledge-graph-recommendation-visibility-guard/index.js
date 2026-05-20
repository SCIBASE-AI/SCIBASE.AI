"use strict"

const crypto = require("node:crypto")

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

function asSet(value) {
  return new Set(Array.isArray(value) ? value : [])
}

function toTime(value) {
  if (!value) return null
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return null
  return time
}

function normalizeActor(actor = {}) {
  return {
    id: actor.id || "anonymous",
    role: actor.role || "viewer",
    institutionId: actor.institutionId || null,
    projectIds: asSet(actor.projectIds),
    consentIds: asSet(actor.consentIds),
    licenseIds: asSet(actor.licenseIds),
    clearanceTags: asSet(actor.clearanceTags),
  }
}

function normalizeNode(node) {
  return {
    id: node.id,
    type: node.type || "artifact",
    title: node.title || node.id,
    visibility: node.visibility || "public",
    institutionId: node.institutionId || null,
    projectId: node.projectId || null,
    embargoUntil: node.embargoUntil || null,
    requiredConsentId: node.requiredConsentId || null,
    licenseId: node.licenseId || null,
    clearanceTag: node.clearanceTag || null,
    status: node.status || "active",
  }
}

function normalizeEvidence(evidence) {
  return {
    id: evidence.id,
    access: evidence.access || "public",
    institutionId: evidence.institutionId || null,
    projectId: evidence.projectId || null,
    embargoUntil: evidence.embargoUntil || null,
    requiredConsentId: evidence.requiredConsentId || null,
    licenseId: evidence.licenseId || null,
    clearanceTag: evidence.clearanceTag || null,
    status: evidence.status || "active",
  }
}

function evaluateAccess(item, actor, nowTime, prefix) {
  const blockers = []
  const warnings = []
  const label = `${prefix} ${item.id}`
  const embargoTime = toTime(item.embargoUntil)

  if (item.status === "retracted" || item.status === "withdrawn") {
    blockers.push(`${label} is ${item.status}`)
  }

  const visibility = item.visibility || item.access || "public"
  if (visibility === "institutional" && item.institutionId && item.institutionId !== actor.institutionId) {
    blockers.push(`${label} requires institution ${item.institutionId}`)
  }

  if (visibility === "project" && item.projectId && !actor.projectIds.has(item.projectId)) {
    blockers.push(`${label} requires project ${item.projectId} membership`)
  }

  if (visibility === "private" && !["owner", "admin", "curator"].includes(actor.role)) {
    blockers.push(`${label} is private`)
  }

  if (visibility === "embargoed") {
    if (!embargoTime) {
      blockers.push(`${label} has an invalid embargo date`)
    } else if (nowTime < embargoTime && !["admin", "curator"].includes(actor.role)) {
      blockers.push(`${label} is embargoed until ${item.embargoUntil}`)
    } else if (nowTime >= embargoTime) {
      warnings.push(`${label} embargo has expired; confirm public release metadata`)
    }
  }

  if (visibility === "restricted" || item.requiredConsentId || item.licenseId || item.clearanceTag) {
    if (item.requiredConsentId && !actor.consentIds.has(item.requiredConsentId)) {
      blockers.push(`${label} requires consent ${item.requiredConsentId}`)
    }
    if (item.licenseId && !actor.licenseIds.has(item.licenseId)) {
      blockers.push(`${label} requires license ${item.licenseId}`)
    }
    if (item.clearanceTag && !actor.clearanceTags.has(item.clearanceTag)) {
      blockers.push(`${label} requires clearance ${item.clearanceTag}`)
    }
  }

  return { blockers, warnings }
}

function evaluateRecommendation(recommendation, context) {
  const blockers = []
  const warnings = []
  const pathNodes = []
  const evidence = []

  for (const nodeId of recommendation.nodeIds || []) {
    const node = context.nodes.get(nodeId)
    if (!node) {
      blockers.push(`missing graph node ${nodeId}`)
      continue
    }
    pathNodes.push(node)
    const access = evaluateAccess(node, context.actor, context.nowTime, "node")
    blockers.push(...access.blockers)
    warnings.push(...access.warnings)
  }

  for (const evidenceId of recommendation.evidenceIds || []) {
    const item = context.evidence.get(evidenceId)
    if (!item) {
      blockers.push(`missing evidence ${evidenceId}`)
      continue
    }
    evidence.push(item)
    const access = evaluateAccess(item, context.actor, context.nowTime, "evidence")
    blockers.push(...access.blockers)
    warnings.push(...access.warnings)
  }

  const distinctBlockers = [...new Set(blockers)]
  const distinctWarnings = [...new Set(warnings)]
  const safeScore = Number(recommendation.score || 0) - distinctWarnings.length * 0.05

  return {
    id: recommendation.id,
    title: recommendation.title || recommendation.id,
    status: distinctBlockers.length > 0 ? "suppressed" : "visible",
    safeScore: Number(Math.max(0, safeScore).toFixed(3)),
    nodeIds: pathNodes.map((node) => node.id),
    evidenceIds: evidence.map((item) => item.id),
    blockers: distinctBlockers,
    warnings: distinctWarnings,
    explanation:
      distinctBlockers.length > 0
        ? "Recommendation is hidden until visibility and evidence access issues are resolved."
        : "Recommendation can be shown with the attached visibility explanation.",
  }
}

function assessRecommendationVisibility(input) {
  const nowTime = toTime(input.now) || Date.now()
  const actor = normalizeActor(input.actor)
  const nodes = new Map((input.nodes || []).map((node) => normalizeNode(node)).map((node) => [node.id, node]))
  const evidence = new Map(
    (input.evidence || []).map((item) => normalizeEvidence(item)).map((item) => [item.id, item]),
  )

  const evaluated = (input.recommendations || [])
    .map((recommendation) => evaluateRecommendation(recommendation, { actor, nodes, evidence, nowTime }))
    .sort((a, b) => b.safeScore - a.safeScore || a.id.localeCompare(b.id))

  const visibleRecommendations = evaluated.filter((item) => item.status === "visible")
  const suppressedRecommendations = evaluated.filter((item) => item.status === "suppressed")
  const curatorActions = suppressedRecommendations.map((item) => ({
    recommendationId: item.id,
    action: "resolve-access-before-discovery",
    reason: item.blockers[0],
  }))

  if (visibleRecommendations.some((item) => item.warnings.length > 0)) {
    curatorActions.push({
      recommendationId: "visible-warnings",
      action: "confirm-release-metadata",
      reason: "some visible recommendations include expired embargo or metadata warnings",
    })
  }

  const result = {
    status:
      suppressedRecommendations.length === 0
        ? visibleRecommendations.some((item) => item.warnings.length > 0)
          ? "needs-review"
          : "ready"
        : "guarded",
    actorId: actor.id,
    visibleCount: visibleRecommendations.length,
    suppressedCount: suppressedRecommendations.length,
    visibleRecommendations,
    suppressedRecommendations,
    curatorActions,
  }

  return {
    ...result,
    auditDigest: digest(result),
  }
}

module.exports = {
  assessRecommendationVisibility,
}
