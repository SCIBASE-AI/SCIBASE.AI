const crypto = require("node:crypto")

const DEFAULT_POLICY = Object.freeze({
  sensitiveObjectTypes: ["dataset", "notebook", "manuscript", "review_thread"],
  restrictedClassifications: ["restricted", "human_subject", "embargoed", "anonymous_review"],
  requiredStewardApprovalActions: ["read", "download", "export", "comment"],
  maxOverrideAgeDays: 90,
  forbiddenInheritedActions: {
    dataset: ["download", "export"],
    notebook: ["execute", "export"],
    manuscript: ["publish"],
    review_thread: ["read", "comment"],
  },
  policyVersion: "object-permission-inheritance-drift-v1",
})

function evaluateObjectPermissionInheritanceDrift(input = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) }
  const asOf = input.asOf || new Date().toISOString()
  const projects = Array.isArray(input.projects) ? input.projects : []
  const decisions = projects.map((project) => evaluateProject(project, policy, asOf))
  const remediationQueue = decisions.flatMap((project) => project.remediationQueue)
  const summary = summarize(decisions, remediationQueue)
  const auditPayload = {
    asOf,
    policy,
    summary,
    projects: decisions.map((project) => ({
      projectId: project.projectId,
      status: project.status,
      findingCodes: project.findings.map((finding) => finding.code),
    })),
  }

  return {
    asOf,
    policy,
    summary,
    projects: decisions,
    remediationQueue,
    readyQueue: decisions
      .filter((project) => project.status === "permission_change_ready")
      .map((project) => ({
        projectId: project.projectId,
        action: "apply_permission_change",
        objectsReviewed: project.summary.objects,
      })),
    audit: {
      algorithm: "sha256",
      digest: digest(auditPayload),
      policyVersion: policy.policyVersion,
    },
  }
}

function evaluateProject(project, policy, asOf) {
  const roles = Array.isArray(project.roles) ? project.roles : []
  const members = Array.isArray(project.members) ? project.members : []
  const objects = Array.isArray(project.objects) ? project.objects : []
  const overrides = Array.isArray(project.objectOverrides) ? project.objectOverrides : []
  const approvals = Array.isArray(project.stewardApprovals) ? project.stewardApprovals : []
  const pendingChanges = Array.isArray(project.pendingPermissionChanges) ? project.pendingPermissionChanges : []
  const rolesById = new Map(roles.map((role) => [role.roleId, role]))
  const membersById = new Map(members.map((member) => [member.memberId, member]))
  const overridesByObject = groupBy(overrides, "objectId")
  const approvalsByObject = groupBy(approvals, "objectId")
  const objectDecisions = objects.map((object) => evaluateObject({
    project,
    object,
    rolesById,
    membersById,
    overrides: overridesByObject.get(object.objectId) || [],
    approvals: approvalsByObject.get(object.objectId) || [],
    pendingChanges,
    policy,
    asOf,
  }))
  const findings = objectDecisions.flatMap((object) => object.findings)
  const criticalFindings = findings.filter((finding) => finding.severity === "critical")
  const warningFindings = findings.filter((finding) => finding.severity === "warning")
  const status = criticalFindings.length > 0
    ? "permission_change_blocked"
    : warningFindings.length > 0
      ? "permission_review_required"
      : "permission_change_ready"

  return {
    projectId: project.projectId,
    title: project.title,
    status,
    summary: {
      objects: objectDecisions.length,
      sensitiveObjects: objectDecisions.filter((object) => object.sensitive).length,
      criticalFindings: criticalFindings.length,
      warningFindings: warningFindings.length,
    },
    objects: objectDecisions,
    findings,
    remediationQueue: findings.map((finding) => ({
      projectId: project.projectId,
      objectId: finding.objectId,
      code: finding.code,
      severity: finding.severity,
      action: findingAction(finding.code),
      remediation: finding.remediation,
    })),
  }
}

function evaluateObject(context) {
  const { object, rolesById, membersById, overrides, approvals, pendingChanges, policy, asOf } = context
  const checks = []
  const findings = []
  const sensitive = isSensitiveObject(object, policy)
  const inheritedExposures = inheritedGrantExposures(object, rolesById, membersById, overrides, policy)
  const staleOverrides = findStaleOverrides(overrides, asOf, policy)
  const staleAllowOverrides = staleOverrides.filter((override) => override.effect === "allow")
  const pendingObjectChanges = pendingChanges.filter((change) => change.objectId === object.objectId)
  const missingApprovals = findMissingStewardApprovals(object, pendingObjectChanges, approvals, policy)
  const overrideGaps = findOverrideGaps(object, rolesById, membersById, overrides, policy)

  addCheck(checks, findings, {
    objectId: object.objectId,
    code: "inherited_grant_overexposure",
    severity: "critical",
    pass: inheritedExposures.length === 0,
    message: inheritedExposures.length === 0
      ? "Inherited role grants do not overexpose this object."
      : `${inheritedExposures.length} inherited grants would overexpose this object.`,
    remediation: "Add explicit deny overrides, narrow the role grant, or split the sensitive object into a restricted workspace.",
    evidence: { exposures: inheritedExposures },
  })

  addCheck(checks, findings, {
    objectId: object.objectId,
    code: "stale_object_override",
    severity: "warning",
    pass: staleAllowOverrides.length === 0,
    message: staleAllowOverrides.length === 0
      ? "No stale allow overrides remain on this object."
      : `${staleAllowOverrides.length} stale allow overrides require review.`,
    remediation: "Recertify, expire, or replace stale object-level allow overrides.",
    evidence: {
      overrideIds: staleAllowOverrides.map((override) => override.overrideId),
      maxOverrideAgeDays: policy.maxOverrideAgeDays,
    },
  })

  addCheck(checks, findings, {
    objectId: object.objectId,
    code: "data_steward_approval_present",
    severity: "critical",
    pass: missingApprovals.length === 0,
    message: missingApprovals.length === 0
      ? "Required data-steward approvals are present for pending sensitive actions."
      : `${missingApprovals.length} pending sensitive actions are missing data-steward approval.`,
    remediation: "Collect current data-steward approval before applying object permission changes.",
    evidence: { missingApprovals },
  })

  addCheck(checks, findings, {
    objectId: object.objectId,
    code: "object_override_completeness",
    severity: "warning",
    pass: overrideGaps.length === 0,
    message: overrideGaps.length === 0
      ? "Object overrides fully cover restricted inherited actions."
      : `${overrideGaps.length} restricted inherited actions lack explicit object overrides.`,
    remediation: "Add object-level deny/allow decisions so inherited project roles cannot drift silently.",
    evidence: { gaps: overrideGaps },
  })

  return {
    objectId: object.objectId,
    objectType: object.objectType,
    classification: object.classification,
    sensitive,
    checks,
    findings,
    effectiveGrants: effectiveGrantSummary(object, rolesById, membersById, overrides),
  }
}

function inheritedGrantExposures(object, rolesById, membersById, overrides, policy) {
  if (!isSensitiveObject(object, policy)) {
    return []
  }

  const forbiddenActions = new Set(policy.forbiddenInheritedActions[object.objectType] || [])
  const denyKeys = new Set(overrides
    .filter((override) => override.effect === "deny")
    .map((override) => `${override.memberId || "*"}:${override.action}`))
  const exposures = []

  for (const member of membersById.values()) {
    for (const roleId of member.roleIds || []) {
      const role = rolesById.get(roleId)
      if (!role) {
        continue
      }

      for (const action of role.actions || []) {
        if (!forbiddenActions.has(action)) {
          continue
        }

        const memberDeny = denyKeys.has(`${member.memberId}:${action}`)
        const wildcardDeny = denyKeys.has(`*:${action}`)
        if (!memberDeny && !wildcardDeny) {
          exposures.push({
            memberId: member.memberId,
            roleId,
            action,
            objectType: object.objectType,
            classification: object.classification,
          })
        }
      }
    }
  }

  return exposures
}

function findStaleOverrides(overrides, asOf, policy) {
  const now = Date.parse(asOf)
  return overrides.filter((override) => {
    const reviewedAt = Date.parse(override.reviewedAt || override.createdAt || "")
    if (!Number.isFinite(reviewedAt)) {
      return true
    }

    const ageDays = (now - reviewedAt) / 86400000
    return ageDays > policy.maxOverrideAgeDays
  })
}

function findMissingStewardApprovals(object, pendingChanges, approvals, policy) {
  if (!isSensitiveObject(object, policy)) {
    return []
  }

  const approvedActions = new Set(approvals
    .filter((approval) => approval.status === "approved" && approval.role === "data_steward")
    .map((approval) => approval.action))
  return pendingChanges
    .filter((change) => policy.requiredStewardApprovalActions.includes(change.action))
    .filter((change) => !approvedActions.has(change.action))
    .map((change) => ({
      changeId: change.changeId,
      action: change.action,
      targetMemberId: change.memberId || null,
    }))
}

function findOverrideGaps(object, rolesById, membersById, overrides, policy) {
  if (!isSensitiveObject(object, policy)) {
    return []
  }

  const forbiddenActions = new Set(policy.forbiddenInheritedActions[object.objectType] || [])
  const overrideKeys = new Set(overrides.map((override) => `${override.memberId || "*"}:${override.action}`))
  const gaps = []

  for (const member of membersById.values()) {
    for (const roleId of member.roleIds || []) {
      const role = rolesById.get(roleId)
      if (!role) {
        continue
      }

      for (const action of role.actions || []) {
        if (!forbiddenActions.has(action)) {
          continue
        }

        const memberKey = `${member.memberId}:${action}`
        const wildcardKey = `*:${action}`
        if (!overrideKeys.has(memberKey) && !overrideKeys.has(wildcardKey)) {
          gaps.push({ memberId: member.memberId, roleId, action })
        }
      }
    }
  }

  return gaps
}

function effectiveGrantSummary(object, rolesById, membersById, overrides) {
  const rows = []

  for (const member of membersById.values()) {
    const inheritedActions = new Set()
    for (const roleId of member.roleIds || []) {
      const role = rolesById.get(roleId)
      for (const action of role ? role.actions || [] : []) {
        inheritedActions.add(action)
      }
    }

    const memberOverrides = overrides.filter((override) => !override.memberId || override.memberId === member.memberId)
    for (const override of memberOverrides) {
      if (override.effect === "deny") {
        inheritedActions.delete(override.action)
      }

      if (override.effect === "allow") {
        inheritedActions.add(override.action)
      }
    }

    rows.push({
      memberId: member.memberId,
      objectId: object.objectId,
      actions: Array.from(inheritedActions).sort(),
    })
  }

  return rows
}

function isSensitiveObject(object, policy) {
  return policy.sensitiveObjectTypes.includes(object.objectType) &&
    policy.restrictedClassifications.includes(object.classification)
}

function groupBy(items, key) {
  const grouped = new Map()
  for (const item of items) {
    const groupKey = item[key]
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, [])
    }
    grouped.get(groupKey).push(item)
  }

  return grouped
}

function addCheck(checks, findings, check) {
  checks.push({
    code: check.code,
    severity: check.severity,
    pass: check.pass,
    message: check.message,
    evidence: check.evidence || {},
  })

  if (!check.pass) {
    findings.push({
      objectId: check.objectId,
      code: check.code,
      severity: check.severity,
      message: check.message,
      remediation: check.remediation,
      evidence: check.evidence || {},
    })
  }
}

function summarize(decisions, remediationQueue) {
  return {
    totalProjects: decisions.length,
    readyProjects: decisions.filter((project) => project.status === "permission_change_ready").length,
    reviewProjects: decisions.filter((project) => project.status === "permission_review_required").length,
    blockedProjects: decisions.filter((project) => project.status === "permission_change_blocked").length,
    totalObjects: decisions.reduce((total, project) => total + project.summary.objects, 0),
    sensitiveObjects: decisions.reduce((total, project) => total + project.summary.sensitiveObjects, 0),
    totalFindings: remediationQueue.length,
    criticalFindings: remediationQueue.filter((item) => item.severity === "critical").length,
    warningFindings: remediationQueue.filter((item) => item.severity === "warning").length,
  }
}

function findingAction(code) {
  const actions = {
    inherited_grant_overexposure: "narrow_inherited_role_or_add_explicit_deny",
    stale_object_override: "recertify_or_expire_object_override",
    data_steward_approval_present: "collect_data_steward_approval",
    object_override_completeness: "add_explicit_object_override_decision",
  }

  return actions[code] || "permission_drift_followup"
}

function digest(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
}

module.exports = {
  DEFAULT_POLICY,
  evaluateObjectPermissionInheritanceDrift,
}
