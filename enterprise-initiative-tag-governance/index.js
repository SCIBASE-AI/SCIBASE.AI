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

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseDate(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function daysBetween(start, end) {
  return Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

function toArray(value) {
  return Array.isArray(value) ? value : []
}

function makePolicyMap(policies) {
  return new Map(
    toArray(policies).map((policy) => {
      const id = normalizeId(policy.id || policy.label)
      return [
        id,
        {
          ...policy,
          id,
          label: policy.label || id,
          allowedScopes: toArray(policy.allowedScopes).map(normalizeId),
          mutuallyExclusiveWith: toArray(policy.mutuallyExclusiveWith).map(normalizeId),
          requiredEvidence: toArray(policy.requiredEvidence),
        },
      ]
    }),
  )
}

function makeProjectMap(projects) {
  return new Map(
    toArray(projects).map((project) => [
      String(project.id),
      {
        ...project,
        funderIds: toArray(project.funderIds).map(String),
        tags: toArray(project.tags),
      },
    ]),
  )
}

function expandAssignments(input) {
  const explicit = toArray(input.assignments)
  const projectTags = toArray(input.projects).flatMap((project) =>
    toArray(project.initiativeTags).map((tag) => ({
      ...tag,
      projectId: project.id,
    })),
  )

  return [...explicit, ...projectTags].map((assignment, index) => ({
    ...assignment,
    index,
    projectId: String(assignment.projectId || ""),
    tagId: normalizeId(assignment.tagId || assignment.tag || assignment.label),
    scope: normalizeId(assignment.scope || assignment.department || assignment.lab || "organization"),
    evidenceIds: toArray(assignment.evidenceIds).map(String),
  }))
}

function scopeMatches(policy, project, assignment) {
  if (!policy.allowedScopes.length || policy.allowedScopes.includes("*")) return true
  const candidates = [
    assignment.scope,
    normalizeId(project.department),
    normalizeId(project.lab),
    normalizeId(project.organizationId),
    "organization",
  ].filter(Boolean)

  return candidates.some((candidate) => policy.allowedScopes.includes(candidate))
}

function hasRestrictedBoundary(project) {
  const visibility = normalizeId(project.visibility)
  const dataClass = normalizeId(project.dataClassification)
  return ["private", "restricted", "sensitive", "embargoed"].includes(visibility) ||
    ["private", "restricted", "sensitive", "regulated", "phi"].includes(dataClass)
}

function findProjectConflicts(assignment, siblings, policy, policyById) {
  const conflicts = []
  for (const sibling of siblings) {
    if (sibling.index === assignment.index || sibling.tagId === assignment.tagId) continue
    const siblingPolicy = policyById.get(sibling.tagId)
    if (!siblingPolicy) continue
    if (policy.mutuallyExclusiveWith.includes(sibling.tagId)) conflicts.push(sibling.tagId)
    if (siblingPolicy.mutuallyExclusiveWith.includes(assignment.tagId)) conflicts.push(sibling.tagId)
  }
  return [...new Set(conflicts)]
}

function evaluateAssignment(assignment, context) {
  const { evidenceIds, now, policyById, projectById, assignmentsByProject } = context
  const blockers = []
  const warnings = []
  const project = projectById.get(assignment.projectId)
  const policy = policyById.get(assignment.tagId)

  if (!assignment.projectId) blockers.push("missing project id")
  if (!assignment.tagId) blockers.push("missing initiative tag id")
  if (!project) blockers.push(`unknown project ${assignment.projectId || "(blank)"}`)
  if (!policy) blockers.push(`unknown initiative tag ${assignment.tagId || "(blank)"}`)

  if (project && policy) {
    if (!scopeMatches(policy, project, assignment)) {
      blockers.push(`tag ${policy.id} is not allowed for scope ${assignment.scope}`)
    }

    if (policy.requiresOwnerApproval && !assignment.ownerApproval) {
      blockers.push(`tag ${policy.id} is missing owner approval`)
    }

    const missingEvidence = policy.requiredEvidence.filter((requiredId) => {
      return !assignment.evidenceIds.includes(requiredId) && !evidenceIds.has(requiredId)
    })
    if (missingEvidence.length > 0) {
      blockers.push(`tag ${policy.id} is missing required evidence: ${missingEvidence.join(", ")}`)
    }

    const assignedAt = parseDate(assignment.assignedAt)
    const expiresAt = parseDate(assignment.expiresAt)
    if (policy.requiresExpiry && !expiresAt) {
      blockers.push(`tag ${policy.id} is missing an expiry date`)
    }
    if (expiresAt && expiresAt < now) {
      blockers.push(`tag ${policy.id} expired on ${expiresAt.toISOString().slice(0, 10)}`)
    }
    if (assignedAt && expiresAt && policy.maxDurationDays && daysBetween(assignedAt, expiresAt) > policy.maxDurationDays) {
      warnings.push(`tag ${policy.id} exceeds the ${policy.maxDurationDays} day maximum duration`)
    }

    if (policy.publishToDashboard && hasRestrictedBoundary(project) && !policy.restrictedDataAllowed) {
      blockers.push(`tag ${policy.id} would expose a restricted project in admin dashboard rollups`)
    }

    if (policy.funderId && !project.funderIds.includes(String(policy.funderId))) {
      blockers.push(`tag ${policy.id} requires funder ${policy.funderId}`)
    }

    const score = Number(project.compliance?.reproducibilityScore ?? 0)
    if (policy.minimumReproducibilityScore && score < policy.minimumReproducibilityScore) {
      warnings.push(`project reproducibility score ${score} is below ${policy.minimumReproducibilityScore}`)
    }

    if (policy.openAccessRequired && normalizeId(project.compliance?.openAccessStatus) !== "open") {
      warnings.push(`project open access status is ${project.compliance?.openAccessStatus || "missing"}`)
    }

    const conflicts = findProjectConflicts(
      assignment,
      assignmentsByProject.get(assignment.projectId) || [],
      policy,
      policyById,
    )
    if (conflicts.length > 0) {
      blockers.push(`tag ${policy.id} conflicts with ${conflicts.join(", ")}`)
    }
  }

  const status = blockers.length > 0 ? "held" : warnings.length > 0 ? "needs-review" : "approved"
  const event = {
    type: status === "approved" ? "enterprise_tag.approved" : "enterprise_tag.held",
    projectId: assignment.projectId,
    tagId: assignment.tagId,
    status,
    blockerCount: blockers.length,
    warningCount: warnings.length,
    issuedAt: now.toISOString(),
  }

  return {
    projectId: assignment.projectId,
    tagId: assignment.tagId,
    label: policy?.label || assignment.tagId,
    scope: assignment.scope,
    status,
    blockers,
    warnings,
    dashboardVisible: Boolean(policy?.publishToDashboard && status !== "held"),
    event: {
      ...event,
      signature: digest(event),
    },
  }
}

function buildDashboardRollups(assignmentReports, projectById) {
  const tagRollups = new Map()
  const departmentRollups = new Map()

  for (const report of assignmentReports) {
    const project = projectById.get(report.projectId)
    const department = project?.department || "unassigned"
    if (!tagRollups.has(report.tagId)) {
      tagRollups.set(report.tagId, {
        tagId: report.tagId,
        label: report.label,
        projectCount: 0,
        approvedCount: 0,
        heldCount: 0,
        needsReviewCount: 0,
        warningCount: 0,
        blockerCount: 0,
        departments: new Set(),
      })
    }
    const tag = tagRollups.get(report.tagId)
    tag.projectCount += 1
    tag.warningCount += report.warnings.length
    tag.blockerCount += report.blockers.length
    tag.departments.add(department)
    if (report.status === "approved") tag.approvedCount += 1
    if (report.status === "held") tag.heldCount += 1
    if (report.status === "needs-review") tag.needsReviewCount += 1

    if (!departmentRollups.has(department)) {
      departmentRollups.set(department, {
        department,
        assignedTags: 0,
        dashboardVisibleTags: 0,
        heldTags: 0,
      })
    }
    const dept = departmentRollups.get(department)
    dept.assignedTags += 1
    if (report.dashboardVisible) dept.dashboardVisibleTags += 1
    if (report.status === "held") dept.heldTags += 1
  }

  return {
    byTag: [...tagRollups.values()]
      .map((rollup) => ({ ...rollup, departments: [...rollup.departments].sort() }))
      .sort((a, b) => a.tagId.localeCompare(b.tagId)),
    byDepartment: [...departmentRollups.values()].sort((a, b) => a.department.localeCompare(b.department)),
  }
}

function assessEnterpriseInitiativeTags(input = {}) {
  const now = parseDate(input.now) || new Date()
  const policyById = makePolicyMap(input.policies)
  const projectById = makeProjectMap(input.projects)
  const evidenceIds = new Set(toArray(input.evidence).map((item) => String(item.id)))
  const assignments = expandAssignments(input)
  const assignmentsByProject = new Map()

  for (const assignment of assignments) {
    if (!assignmentsByProject.has(assignment.projectId)) assignmentsByProject.set(assignment.projectId, [])
    assignmentsByProject.get(assignment.projectId).push(assignment)
  }

  const context = { evidenceIds, now, policyById, projectById, assignmentsByProject }
  const assignmentReports = assignments.map((assignment) => evaluateAssignment(assignment, context))
  const blockerCount = assignmentReports.reduce((sum, report) => sum + report.blockers.length, 0)
  const warningCount = assignmentReports.reduce((sum, report) => sum + report.warnings.length, 0)
  const dashboardRollups = buildDashboardRollups(assignmentReports, projectById)

  const reviewerPacket = {
    organizationId: input.organizationId || "enterprise-org",
    evaluatedAt: now.toISOString(),
    status: blockerCount > 0 ? "blocked" : warningCount > 0 ? "needs-review" : "ready",
    summary: {
      policies: policyById.size,
      projects: projectById.size,
      assignments: assignments.length,
      approved: assignmentReports.filter((report) => report.status === "approved").length,
      needsReview: assignmentReports.filter((report) => report.status === "needs-review").length,
      held: assignmentReports.filter((report) => report.status === "held").length,
      blockerCount,
      warningCount,
    },
    assignmentReports,
    dashboardRollups,
    webhookEvents: assignmentReports.map((report) => report.event),
  }

  return {
    ...reviewerPacket,
    auditDigest: digest(reviewerPacket),
  }
}

module.exports = {
  assessEnterpriseInitiativeTags,
  normalizeId,
  stableStringify,
}
