import { createHash } from "node:crypto"

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_TOKEN_LIFETIME_DAYS = 120
const MAX_HIGH_RISK_LIFETIME_DAYS = 45
const MAX_ROTATION_AGE_DAYS = 90

const dangerousScopes = new Set([
  "*",
  "project:admin",
  "project:archive",
  "dataset:delete",
  "restricted-data:download",
  "manuscript:publish",
])

const requiredApprovalEvents = new Set(["requested", "owner_approved", "issued"])

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

export const digestRecord = (record) =>
  createHash("sha256").update(stableStringify(record)).digest("hex")

const dateDiffDays = (from, to) => {
  const start = Date.parse(from)
  const end = Date.parse(to)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Infinity
  return Math.ceil((end - start) / DAY_MS)
}

const daysSince = (date, now) => {
  const timestamp = Date.parse(date)
  const current = Date.parse(now)
  if (!Number.isFinite(timestamp) || !Number.isFinite(current)) return Infinity
  return Math.floor((current - timestamp) / DAY_MS)
}

const ownerMap = (owners) => new Map((owners ?? []).map((owner) => [owner.id, owner]))

const hasDangerousScope = (account) =>
  (account.scopes ?? []).some((scope) => dangerousScopes.has(scope))

const scopeRisk = (scope) => {
  if (scope === "*") return 45
  if (scope.includes("admin") || scope.includes("delete") || scope.includes("publish")) return 22
  if (scope.includes("restricted-data")) return 25
  if (scope.includes("write") || scope.includes("run")) return 9
  return 3
}

const grantRisk = (grant, project) => {
  const reasons = []
  let score = 0

  if ((project.restrictedArtifactIds ?? []).includes(grant.artifactId)) {
    score += 18
    reasons.push("restricted_artifact")
  }
  if (/restricted|blind|human/i.test(grant.dataClass ?? "")) {
    score += 18
    reasons.push("sensitive_data_class")
  }
  if (/download|delete|publish|admin/i.test(grant.permission ?? "")) {
    score += 20
    reasons.push("protected_permission")
  }
  if (!grant.approvedUseCase) {
    score += 16
    reasons.push("missing_approved_use_case")
  }

  return {
    artifactId: grant.artifactId,
    permission: grant.permission,
    dataClass: grant.dataClass,
    score,
    reasons,
  }
}

const missingApprovalEvents = (account) =>
  [...requiredApprovalEvents].filter((event) => !(account.approvalEvents ?? []).includes(event))

const makeAction = (accountId, severity, code, message) => ({
  accountId,
  severity,
  code,
  message,
})

export function evaluateServiceTokenGovernance(packet) {
  const generatedAt = packet.generatedAt
  const ownersById = ownerMap(packet.owners)
  const decisions = []
  const ownerQueue = []

  for (const account of packet.serviceAccounts ?? []) {
    const owner = ownersById.get(account.ownerSponsorId)
    const blockers = []
    const warnings = []
    const grantFindings = (account.objectGrants ?? []).map((grant) =>
      grantRisk(grant, packet.project),
    )

    let riskScore = (account.scopes ?? []).reduce((sum, scope) => sum + scopeRisk(scope), 0)
    riskScore += grantFindings.reduce((sum, finding) => sum + finding.score, 0)

    if (!owner) {
      blockers.push("owner_sponsor_missing")
      riskScore += 24
    } else {
      if (!owner.active) {
        blockers.push("owner_sponsor_inactive")
        riskScore += 24
      }
      if (!owner.mfaVerified) {
        blockers.push("owner_sponsor_mfa_missing")
        riskScore += 18
      }
      if (!(packet.project.institutionDomains ?? []).includes(owner.institutionDomain)) {
        blockers.push("owner_sponsor_outside_institution")
        riskScore += 12
      }
    }

    if (!account.requesterMfaVerified) {
      blockers.push("requester_mfa_missing")
      riskScore += 16
    }
    if (!account.integrationVerified) {
      blockers.push("integration_unverified")
      riskScore += 18
    }
    if (!account.expiresAt) {
      blockers.push("token_expiry_missing")
      riskScore += 20
    } else {
      const lifetimeDays = dateDiffDays(account.requestedAt, account.expiresAt)
      const maxLifetime = hasDangerousScope(account)
        ? MAX_HIGH_RISK_LIFETIME_DAYS
        : MAX_TOKEN_LIFETIME_DAYS
      if (lifetimeDays > maxLifetime) {
        blockers.push("token_lifetime_too_long")
        riskScore += 12
      }
      if (dateDiffDays(generatedAt, account.expiresAt) < 0) {
        blockers.push("token_expired")
        riskScore += 30
      }
    }

    if (daysSince(account.lastRotatedAt, generatedAt) > MAX_ROTATION_AGE_DAYS) {
      blockers.push("rotation_stale")
      riskScore += 14
    }

    if ((account.scopes ?? []).includes("*")) {
      blockers.push("wildcard_scope")
      riskScore += 35
    }
    for (const scope of account.scopes ?? []) {
      if ((packet.project.protectedActions ?? []).includes(scope)) {
        warnings.push(`protected_scope:${scope}`)
      }
    }

    for (const finding of grantFindings) {
      if (finding.reasons.includes("missing_approved_use_case")) {
        blockers.push(`missing_use_case:${finding.artifactId}`)
      }
      if (
        finding.reasons.includes("sensitive_data_class") &&
        finding.reasons.includes("protected_permission")
      ) {
        blockers.push(`sensitive_protected_grant:${finding.artifactId}`)
      }
    }

    const missingEvents = missingApprovalEvents(account)
    if (missingEvents.length > 0) {
      blockers.push(...missingEvents.map((event) => `approval_event_missing:${event}`))
      riskScore += missingEvents.length * 10
    }

    const dedupedBlockers = [...new Set(blockers)]
    const dedupedWarnings = [...new Set(warnings)]
    const severity =
      riskScore >= 95 || dedupedBlockers.includes("wildcard_scope")
        ? "critical"
        : riskScore >= 60
          ? "high"
          : riskScore >= 30
            ? "medium"
            : "low"
    const decision = dedupedBlockers.some((blocker) =>
      /wildcard_scope|owner_sponsor_missing|token_expiry_missing|sensitive_protected_grant|requester_mfa_missing|integration_unverified/.test(
        blocker,
      ),
    )
      ? "deny_or_revoke"
      : dedupedBlockers.length > 0 || severity === "medium"
        ? "hold_for_owner_review"
        : "issue_or_retain"

    if (decision === "deny_or_revoke") {
      ownerQueue.push(
        makeAction(
          account.id,
          severity,
          "revoke_or_deny_token",
          `${account.displayName} cannot be safely issued or retained until blockers are resolved.`,
        ),
      )
    } else if (decision === "hold_for_owner_review") {
      ownerQueue.push(
        makeAction(
          account.id,
          severity,
          "owner_review_required",
          `${account.displayName} needs owner review before issuance or retention.`,
        ),
      )
    }

    decisions.push({
      accountId: account.id,
      displayName: account.displayName,
      kind: account.kind,
      decision,
      severity,
      riskScore,
      blockers: dedupedBlockers,
      warnings: dedupedWarnings,
      allowedScopes: (account.scopes ?? []).filter((scope) => !dangerousScopes.has(scope)),
      rejectedScopes: (account.scopes ?? []).filter((scope) => dangerousScopes.has(scope)),
      grantFindings,
      auditDigest: digestRecord({
        projectId: packet.project.id,
        accountId: account.id,
        decision,
        severity,
        riskScore,
        blockers: dedupedBlockers,
        warnings: dedupedWarnings,
        grantFindings,
      }),
    })
  }

  const summary = {
    projectId: packet.project.id,
    evaluatedAt: generatedAt,
    totalAccounts: decisions.length,
    issueOrRetain: decisions.filter((item) => item.decision === "issue_or_retain").length,
    holdForOwnerReview: decisions.filter((item) => item.decision === "hold_for_owner_review").length,
    denyOrRevoke: decisions.filter((item) => item.decision === "deny_or_revoke").length,
    criticalFindings: decisions.filter((item) => item.severity === "critical").length,
    highFindings: decisions.filter((item) => item.severity === "high").length,
    protectedScopesBlocked: decisions.reduce(
      (sum, item) => sum + item.rejectedScopes.length,
      0,
    ),
    ownerActions: ownerQueue.length,
  }

  const auditPacket = {
    summary,
    decisions,
    ownerQueue,
    controlCoverage: {
      identityAndMfa: true,
      serviceAccountSponsorship: true,
      projectWorkspaceScope: true,
      objectLevelAccess: true,
      externalCollaboratorRisk: true,
      auditLogEvidence: true,
      tokenExpiryAndRotation: true,
    },
  }

  return {
    ...auditPacket,
    packetDigest: digestRecord(auditPacket),
  }
}

export function renderOwnerReviewMarkdown(result) {
  const lines = [
    "# Service Account Governance Review Packet",
    "",
    `Project: \`${result.summary.projectId}\``,
    `Evaluated at: \`${result.summary.evaluatedAt}\``,
    `Packet digest: \`${result.packetDigest}\``,
    "",
    "## Summary",
    "",
    `- Accounts evaluated: ${result.summary.totalAccounts}`,
    `- Issue or retain: ${result.summary.issueOrRetain}`,
    `- Hold for owner review: ${result.summary.holdForOwnerReview}`,
    `- Deny or revoke: ${result.summary.denyOrRevoke}`,
    `- Critical findings: ${result.summary.criticalFindings}`,
    `- Protected scopes blocked: ${result.summary.protectedScopesBlocked}`,
    "",
    "## Decisions",
    "",
  ]

  for (const decision of result.decisions) {
    lines.push(
      `### ${decision.displayName}`,
      "",
      `- Account: \`${decision.accountId}\``,
      `- Decision: \`${decision.decision}\``,
      `- Severity: \`${decision.severity}\``,
      `- Risk score: ${decision.riskScore}`,
      `- Rejected scopes: ${decision.rejectedScopes.length > 0 ? decision.rejectedScopes.map((scope) => `\`${scope}\``).join(", ") : "none"}`,
      `- Blockers: ${decision.blockers.length > 0 ? decision.blockers.map((blocker) => `\`${blocker}\``).join(", ") : "none"}`,
      `- Audit digest: \`${decision.auditDigest}\``,
      "",
    )
  }

  lines.push("## Owner Queue", "")
  for (const action of result.ownerQueue) {
    lines.push(
      `- \`${action.severity}\` \`${action.accountId}\` ${action.code}: ${action.message}`,
    )
  }

  return `${lines.join("\n")}\n`
}

export function renderSummarySvg(result) {
  const width = 960
  const height = 540
  const rows = result.decisions
    .map((decision, index) => {
      const y = 168 + index * 64
      const fill =
        decision.decision === "issue_or_retain"
          ? "#0f766e"
          : decision.decision === "hold_for_owner_review"
            ? "#b45309"
            : "#991b1b"
      return `<g>
  <rect x="72" y="${y}" width="816" height="44" rx="6" fill="${fill}" opacity="0.92"/>
  <text x="96" y="${y + 28}" font-family="Arial" font-size="20" fill="#ffffff">${decision.accountId}</text>
  <text x="470" y="${y + 28}" font-family="Arial" font-size="20" fill="#ffffff">${decision.decision}</text>
  <text x="736" y="${y + 28}" font-family="Arial" font-size="20" fill="#ffffff">${decision.riskScore}</text>
</g>`
    })
    .join("\n")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="#101820"/>
<rect x="48" y="48" width="864" height="444" rx="10" fill="#17212b"/>
<rect x="48" y="48" width="864" height="8" fill="#2dd4bf"/>
<text x="72" y="104" font-family="Arial" font-size="34" font-weight="700" fill="#ffffff">Service Account Governance Guard</text>
<text x="72" y="138" font-family="Arial" font-size="18" fill="#cbd5e1">issue/retain ${result.summary.issueOrRetain} | review ${result.summary.holdForOwnerReview} | deny/revoke ${result.summary.denyOrRevoke}</text>
<text x="96" y="158" font-family="Arial" font-size="14" fill="#94a3b8">account</text>
<text x="470" y="158" font-family="Arial" font-size="14" fill="#94a3b8">decision</text>
<text x="736" y="158" font-family="Arial" font-size="14" fill="#94a3b8">risk</text>
${rows}
</svg>
`
}
