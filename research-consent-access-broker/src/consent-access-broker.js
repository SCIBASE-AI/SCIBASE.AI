import crypto from "node:crypto"

const DAY_MS = 24 * 60 * 60 * 1000

function asDate(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

function daysUntil(date, currentDate) {
  return Math.floor((asDate(date).getTime() - asDate(currentDate).getTime()) / DAY_MS)
}

function normalizeEmail(email = "") {
  return email.trim().toLowerCase()
}

function normalizeList(values = []) {
  return values.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
}

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

function auditDigest(event) {
  return crypto.createHash("sha256").update(stableStringify(event)).digest("hex").slice(0, 16)
}

function groupBy(items = [], key) {
  const groups = new Map()
  for (const item of items) {
    const groupKey = item[key]
    groups.set(groupKey, [...(groups.get(groupKey) || []), item])
  }
  return groups
}

function buildIndexes(workspace) {
  return {
    researchers: new Map(workspace.researchers.map((researcher) => [researcher.id, researcher])),
    projects: new Map(workspace.projects.map((project) => [project.id, project])),
    objects: new Map(workspace.objects.map((object) => [object.id, object])),
    protocols: new Map(workspace.protocols.map((protocol) => [protocol.id, protocol])),
    consentsByResearcher: groupBy(workspace.consentRecords, "researcherId"),
    duasByInstitution: groupBy(workspace.dataUseAgreements, "institution"),
    membershipsByProject: groupBy(workspace.memberships, "projectId"),
    grantsByObject: groupBy(workspace.objectGrants, "objectId"),
  }
}

function hasProjectRole(researcherId, projectId, membershipsByProject) {
  return (membershipsByProject.get(projectId) || []).find((membership) => membership.researcherId === researcherId)
}

function hasObjectGrant(researcher, object, grantsByObject) {
  const grants = grantsByObject.get(object.id) || []
  const researcherEmail = normalizeEmail(researcher.email)
  const researcherGroups = normalizeList(researcher.groups)

  return grants.find((grant) => {
    if (grant.researcherId === researcher.id) return true
    if (normalizeEmail(grant.email) === researcherEmail) return true
    return normalizeList(grant.groups).some((group) => researcherGroups.includes(group))
  })
}

function findConsent(researcher, object, consentRecords) {
  const records = consentRecords.get(researcher.id) || []
  const objectCategories = normalizeList(object.dataCategories)
  const objectPurpose = String(object.purpose || "").toLowerCase()

  return records.find((record) => {
    if (record.protocolId !== object.protocolId) return false
    if (record.revokedAt) return false

    const recordCategories = normalizeList(record.dataCategories)
    const recordPurposes = normalizeList(record.allowedPurposes)

    return objectCategories.every((category) => recordCategories.includes(category)) && recordPurposes.includes(objectPurpose)
  })
}

function findAgreement(researcher, object, duasByInstitution, currentDate) {
  const agreements = duasByInstitution.get(researcher.institution) || []

  return agreements.find((agreement) => {
    if (agreement.protocolId !== object.protocolId) return false
    if (daysUntil(agreement.expiresAt, currentDate) < 0) return false
    if (object.requiresExport && !agreement.allowsExport) return false
    if (object.reviewerOnly && !agreement.allowsReviewerAccess) return false
    return true
  })
}

function evaluateResearcherObject({ researcher, project, object, indexes, currentDate }) {
  const reasons = []
  const warnings = []
  const membership = hasProjectRole(researcher.id, project.id, indexes.membershipsByProject)
  const grant = hasObjectGrant(researcher, object, indexes.grantsByObject)
  const protocol = indexes.protocols.get(object.protocolId)
  const consent = findConsent(researcher, object, indexes.consentsByResearcher)
  const agreement = findAgreement(researcher, object, indexes.duasByInstitution, currentDate)

  if (!membership) reasons.push("no-project-membership")
  if (!grant && object.sensitivity !== "public") reasons.push("no-object-level-grant")
  if (!protocol) reasons.push("missing-protocol")
  if (protocol && protocol.status !== "approved") reasons.push("protocol-not-approved")
  if (protocol && daysUntil(protocol.irbExpiresAt, currentDate) < 0) reasons.push("irb-expired")
  if (object.requiresConsent && !consent) reasons.push("missing-or-revoked-consent")
  if (object.requiresDua && !agreement) reasons.push("missing-or-expired-dua")
  if (object.sensitivity === "restricted" && !researcher.mfaEnabled) reasons.push("mfa-required")

  if (researcher.identityMode === "anonymous-reviewer" && !object.reviewerOnly) {
    reasons.push("anonymous-reviewer-private-data-block")
  }

  if (researcher.samlDomain && !researcher.email.endsWith(`@${researcher.samlDomain}`)) {
    reasons.push("saml-domain-mismatch")
  }

  if (protocol && daysUntil(protocol.irbExpiresAt, currentDate) <= 30 && daysUntil(protocol.irbExpiresAt, currentDate) >= 0) {
    warnings.push("irb-renewal-window")
  }

  if (agreement && daysUntil(agreement.expiresAt, currentDate) <= 30) {
    warnings.push("dua-renewal-window")
  }

  return {
    researcherId: researcher.id,
    projectId: project.id,
    objectId: object.id,
    allowed: reasons.length === 0,
    reasons,
    warnings,
    role: membership?.role || "none",
    grant: grant?.scope || "none",
    consentId: consent?.id || null,
    agreementId: agreement?.id || null,
  }
}

function evaluateInvitations(workspace, indexes, currentDate) {
  return workspace.invitations.map((invitation) => {
    const project = indexes.projects.get(invitation.projectId)
    const normalizedEmail = normalizeEmail(invitation.email)
    const domain = normalizedEmail.split("@")[1]
    const protocolIds = new Set(
      workspace.objects.filter((object) => object.projectId === invitation.projectId).map((object) => object.protocolId),
    )
    const hasActiveAgreement = [...protocolIds].some((protocolId) =>
      (indexes.duasByInstitution.get(invitation.institution) || []).some(
        (agreement) => agreement.protocolId === protocolId && daysUntil(agreement.expiresAt, currentDate) >= 0,
      ),
    )
    const reasons = []

    if (!project) reasons.push("unknown-project")
    if (invitation.expiresAt && daysUntil(invitation.expiresAt, currentDate) < 0) reasons.push("stale-invitation")
    if (invitation.requiresDua && !hasActiveAgreement) reasons.push("no-active-institution-dua")
    if (invitation.expectedDomain && invitation.expectedDomain !== domain) reasons.push("email-domain-mismatch")

    return {
      invitationId: invitation.id,
      projectId: invitation.projectId,
      email: normalizedEmail,
      action: reasons.length === 0 ? "send" : "hold",
      reasons,
    }
  })
}

function findGrantDrift(workspace, indexes) {
  const knownResearchers = new Set(workspace.researchers.map((researcher) => researcher.id))
  const memberships = new Set(workspace.memberships.map((membership) => `${membership.projectId}:${membership.researcherId}`))

  return workspace.objectGrants
    .filter((grant) => grant.researcherId)
    .map((grant) => {
      const object = indexes.objects.get(grant.objectId)
      const projectId = object?.projectId
      const membershipKey = `${projectId}:${grant.researcherId}`
      const reasons = []

      if (!knownResearchers.has(grant.researcherId)) reasons.push("unknown-researcher")
      if (projectId && !memberships.has(membershipKey)) reasons.push("grant-without-project-membership")

      return reasons.length
        ? {
            grantId: grant.id,
            objectId: grant.objectId,
            researcherId: grant.researcherId,
            action: "review-grant",
            reasons,
          }
        : null
    })
    .filter(Boolean)
}

export function evaluateConsentAccess(workspace, options = {}) {
  const currentDate = options.currentDate || workspace.currentDate
  const indexes = buildIndexes(workspace)
  const decisions = []

  for (const project of workspace.projects) {
    for (const object of workspace.objects.filter((candidate) => candidate.projectId === project.id)) {
      for (const researcher of workspace.researchers) {
        decisions.push(evaluateResearcherObject({ researcher, project, object, indexes, currentDate }))
      }
    }
  }

  const invitationActions = evaluateInvitations(workspace, indexes, currentDate)
  const grantDrift = findGrantDrift(workspace, indexes)
  const allowed = decisions.filter((decision) => decision.allowed)
  const held = decisions.filter((decision) => !decision.allowed)

  const auditEvents = [...allowed, ...held, ...invitationActions, ...grantDrift].map((event) => ({
    ...event,
    digest: auditDigest(event),
  }))

  return {
    generatedAt: currentDate,
    summary: {
      projects: workspace.projects.length,
      researchers: workspace.researchers.length,
      objects: workspace.objects.length,
      allowed: allowed.length,
      held: held.length,
      invitationHolds: invitationActions.filter((action) => action.action === "hold").length,
      grantDrift: grantDrift.length,
    },
    decisions,
    invitationActions,
    grantDrift,
    auditEvents,
  }
}

export function buildReviewerPacket(workspace, options = {}) {
  const report = evaluateConsentAccess(workspace, options)
  const heldByReason = {}

  for (const decision of report.decisions.filter((decision) => !decision.allowed)) {
    for (const reason of decision.reasons) {
      heldByReason[reason] = (heldByReason[reason] || 0) + 1
    }
  }

  return {
    ...report,
    heldByReason,
    reviewerChecklist: [
      "Review held access before adding users to sensitive project spaces.",
      "Renew IRB and DUA records before expiry windows close.",
      "Resolve grant drift before exporting project archives.",
      "Keep anonymous reviewers restricted to blinded review objects.",
    ],
  }
}
