const crypto = require("node:crypto")

const GENERATED_AT = "2026-05-21T14:45:00.000Z"

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function digestFor(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex")
}

function hoursSince(value, now = GENERATED_AT) {
  return Math.max(0, (new Date(now).getTime() - new Date(value).getTime()) / 3600000)
}

function finding(code, severity, message, detail = {}) {
  return { code, severity, message, detail }
}

function action(code, owner, message) {
  return { code, owner, message }
}

function terminalTimestamp(identity) {
  return identity.terminationAt || identity.transferAt || GENERATED_AT
}

function isLeaver(identity) {
  return ["terminated", "contract-ended"].includes(identity.hrisStatus)
}

function isTransfer(identity) {
  return identity.hrisStatus === "department-transfer"
}

function evaluateIdentity(identity, policy) {
  const findings = []
  const terminalAt = terminalTimestamp(identity)
  const hoursOpen = hoursSince(terminalAt)
  const activeProtectedRoles = identity.roles.filter((role) => policy.protectedRoles.includes(role))
  const activeTokens = identity.apiTokens.filter((token) => token.active)
  const activeConnectors = identity.exportConnectors.filter((connector) => connector.active)

  if (isLeaver(identity) && identity.scimActive) {
    findings.push(finding("SCIM_ACCOUNT_STILL_ACTIVE", "blocker", "SCIM account remains active after HRIS leaver event.", {
      hrisStatus: identity.hrisStatus,
      hoursSinceEvent: Number(hoursOpen.toFixed(1)),
    }))
  }

  if (isLeaver(identity) && activeProtectedRoles.length > 0) {
    findings.push(finding("PROTECTED_ROLE_NOT_REVOKED", "blocker", "Leaver still has protected enterprise roles.", {
      roles: activeProtectedRoles,
    }))
  }

  if (isLeaver(identity) && activeTokens.length > 0 && hoursOpen > policy.maxTokenAgeAfterTerminationHours) {
    findings.push(finding("ACTIVE_API_TOKEN_AFTER_TERMINATION", "blocker", "Active API tokens remain past the termination grace window.", {
      tokenIds: activeTokens.map((token) => token.id),
      hoursSinceTermination: Number(hoursOpen.toFixed(1)),
    }))
  }

  if (activeConnectors.length > 0 && (isLeaver(identity) || isTransfer(identity))) {
    findings.push(finding("EXPORT_CONNECTOR_OWNER_REVIEW", isLeaver(identity) ? "blocker" : "warning", "External export connector ownership needs reassignment or approval.", {
      connectors: activeConnectors.map((connector) => ({ id: connector.id, system: connector.system })),
    }))
  }

  if (identity.seatLicense.active && isLeaver(identity) && hoursOpen > policy.maxSeatGraceHours) {
    findings.push(finding("SEAT_LICENSE_RECLAIM_OVERDUE", "warning", "Enterprise seat license should be reclaimed after leaver grace period.", {
      plan: identity.seatLicense.plan,
      hoursSinceTermination: Number(hoursOpen.toFixed(1)),
    }))
  }

  if (identity.computeQuota.active && (isLeaver(identity) || isTransfer(identity))) {
    findings.push(finding("COMPUTE_QUOTA_REASSIGNMENT_NEEDED", isLeaver(identity) ? "blocker" : "warning", "Active compute quota must be reclaimed or moved to a new accountable owner.", {
      remainingHours: identity.computeQuota.remainingHours,
    }))
  }

  const publicationsNeedingTransfer = identity.pendingPublications.filter((publication) => publication.needsOwnerTransfer)
  if (publicationsNeedingTransfer.length > 0 && (isLeaver(identity) || isTransfer(identity))) {
    findings.push(finding("PUBLICATION_OWNER_TRANSFER_NEEDED", "warning", "Pending publications need a replacement accountable owner before export.", {
      publicationIds: publicationsNeedingTransfer.map((publication) => publication.id),
    }))
  }

  if (isTransfer(identity) && activeProtectedRoles.length > 0) {
    findings.push(finding("TRANSFER_PROTECTED_ROLE_REVIEW", "warning", "Department transfer should review elevated enterprise roles.", {
      roles: activeProtectedRoles,
      department: identity.department,
    }))
  }

  const blockers = findings.filter((item) => item.severity === "blocker")
  const warnings = findings.filter((item) => item.severity === "warning")
  const status = blockers.length > 0 ? "revoke" : (warnings.length > 0 ? "review" : "clear")

  const decision = {
    id: identity.id,
    email: identity.email,
    status,
    hrisStatus: identity.hrisStatus,
    scimActive: identity.scimActive,
    protectedRoles: activeProtectedRoles,
    activeTokens: activeTokens.map((token) => token.id),
    activeExportConnectors: activeConnectors.map((connector) => connector.id),
    findings,
    adminActions: buildAdminActions(status, findings),
  }

  return {
    ...decision,
    auditDigest: digestFor(decision),
  }
}

function buildAdminActions(status, findings) {
  if (status === "clear") {
    return [action("NO_DEPROVISIONING_ACTION", "enterprise-admin", "Identity is aligned with HRIS and SCIM state.")]
  }

  const actions = []
  for (const item of findings) {
    if (item.code === "SCIM_ACCOUNT_STILL_ACTIVE") {
      actions.push(action("DISABLE_SCIM_ACCOUNT", "identity-admin", "Disable the SCIM account and sync downstream roles."))
    } else if (item.code === "ACTIVE_API_TOKEN_AFTER_TERMINATION") {
      actions.push(action("REVOKE_API_TOKENS", "security-admin", "Revoke active API tokens tied to the leaver account."))
    } else if (item.code === "PROTECTED_ROLE_NOT_REVOKED") {
      actions.push(action("REMOVE_PROTECTED_ROLES", "enterprise-admin", "Remove protected enterprise roles or transfer them to an approved owner."))
    } else if (item.code === "EXPORT_CONNECTOR_OWNER_REVIEW") {
      actions.push(action("TRANSFER_EXPORT_CONNECTOR_OWNER", "integration-admin", "Assign export connector ownership to an active accountable owner."))
    } else if (item.code === "COMPUTE_QUOTA_REASSIGNMENT_NEEDED") {
      actions.push(action("RECLAIM_COMPUTE_QUOTA", "finance-ops", "Reclaim or reassign compute quota before further usage."))
    } else if (item.code === "PUBLICATION_OWNER_TRANSFER_NEEDED") {
      actions.push(action("TRANSFER_PUBLICATION_OWNER", "research-office", "Assign replacement owner for pending publication exports."))
    } else {
      actions.push(action(`ADDRESS_${item.code}`, "enterprise-admin", item.message))
    }
  }

  return [...new Map(actions.map((item) => [item.code, item])).values()]
}

function evaluateEnterpriseIdentities({ identities, deprovisioningPolicy }) {
  const decisions = identities.map((identity) => evaluateIdentity(identity, deprovisioningPolicy))
  const summary = {
    totalIdentities: decisions.length,
    clear: decisions.filter((decision) => decision.status === "clear").length,
    review: decisions.filter((decision) => decision.status === "review").length,
    revoke: decisions.filter((decision) => decision.status === "revoke").length,
    adminActions: decisions.reduce((sum, decision) => sum + decision.adminActions.length, 0),
    activeTokensAtRisk: decisions.reduce((sum, decision) => sum + decision.activeTokens.length, 0),
  }

  return {
    generatedAt: GENERATED_AT,
    policy: deprovisioningPolicy,
    summary,
    decisions,
    audit: {
      source: "synthetic-enterprise-scim-deprovisioning-review",
      digest: digestFor({ summary, decisions }),
    },
  }
}

module.exports = {
  evaluateEnterpriseIdentities,
  evaluateIdentity,
}
