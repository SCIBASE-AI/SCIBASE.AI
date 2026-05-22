import { createHash } from "node:crypto"

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_RELATIONSHIP_DAYS = 1095
const STALE_DISCLOSURE_DAYS = 180

const hardConflictTypes = new Set([
  "same_lab",
  "mentor_student",
  "shared_grant",
  "financial_dependency",
  "active_collaboration",
])

const softConflictTypes = new Set([
  "coauthorship",
  "shared_institution",
  "prior_public_comment",
  "challenge_teammate",
])

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

const daysBetween = (from, to) => {
  const start = Date.parse(from)
  const end = Date.parse(to)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Infinity
  return Math.floor((end - start) / DAY_MS)
}

const indexById = (items) => new Map((items ?? []).map((item) => [item.id, item]))

const formatPercent = (value) => `${Math.round(value * 100)}%`

const relationshipRisk = (relationship, generatedAt) => {
  const ageDays = daysBetween(relationship.startedAt, generatedAt)
  const recent = ageDays <= RECENT_RELATIONSHIP_DAYS
  if (relationship.type === "prior_public_comment") {
    return {
      code: relationship.type,
      severity: "low",
      points: recent ? 8 : 4,
      hard: false,
      evidence: relationship.evidence,
    }
  }
  if (relationship.type === "coauthorship") {
    return {
      code: relationship.type,
      severity: recent ? "high" : "medium",
      points: recent ? 22 : 12,
      hard: false,
      evidence: relationship.evidence,
    }
  }
  if (hardConflictTypes.has(relationship.type)) {
    return {
      code: relationship.type,
      severity: recent ? "critical" : "high",
      points: recent ? 40 : 26,
      hard: recent,
      evidence: relationship.evidence,
    }
  }
  if (softConflictTypes.has(relationship.type)) {
    return {
      code: relationship.type,
      severity: recent ? "medium" : "low",
      points: recent ? 18 : 8,
      hard: false,
      evidence: relationship.evidence,
    }
  }
  return {
    code: relationship.type,
    severity: "low",
    points: 5,
    hard: false,
    evidence: relationship.evidence,
  }
}

const anonymizedReviewerLabel = (reviewerId) =>
  `reviewer-${digestRecord({ reviewerId }).slice(0, 8)}`

const relationshipRows = (relationships, reviewerId, authorIds) =>
  (relationships ?? []).filter(
    (relationship) =>
      relationship.reviewerId === reviewerId && authorIds.includes(relationship.authorId),
  )

const makeAction = (assignmentId, severity, code, message) => ({
  assignmentId,
  severity,
  code,
  message,
})

export function evaluatePeerReviewRecusals(packet) {
  const usersById = indexById(packet.users)
  const project = packet.project ?? {}
  const decisions = []
  const stewardQueue = []

  for (const assignment of packet.assignments ?? []) {
    const reviewer = usersById.get(assignment.reviewerId)
    const blockers = []
    const warnings = []
    const findings = []
    let riskScore = 0

    if (!reviewer) {
      blockers.push("reviewer_missing")
      riskScore += 50
    } else {
      if (!reviewer.active) {
        blockers.push("reviewer_inactive")
        riskScore += 35
      }
      if ((reviewer.completedReviews ?? 0) < 10) {
        warnings.push("reviewer_history_thin")
        riskScore += 7
      }
      if ((reviewer.averageCalibrationScore ?? 0) < 0.75) {
        warnings.push("calibration_below_threshold")
        riskScore += 12
      }
      if (daysBetween(reviewer.disclosureUpdatedAt, packet.generatedAt) > STALE_DISCLOSURE_DAYS) {
        warnings.push("conflict_disclosure_stale")
        riskScore += 14
      }
    }

    const rows = relationshipRows(
      packet.relationships,
      assignment.reviewerId,
      project.authorIds ?? [],
    )
    for (const row of rows) {
      const finding = relationshipRisk(row, packet.generatedAt)
      findings.push({
        authorId: row.authorId,
        type: row.type,
        severity: finding.severity,
        points: finding.points,
        hard: finding.hard,
        evidence: finding.evidence,
      })
      riskScore += finding.points
      if (finding.hard) blockers.push(`hard_conflict:${row.type}`)
      else warnings.push(`relationship:${row.type}`)
    }

    const reviewerInstitutionMatches = reviewer
      ? (project.institutionIds ?? []).includes(reviewer.institutionId)
      : false
    if (
      reviewerInstitutionMatches &&
      assignment.mode === "double_blind" &&
      !warnings.includes("relationship:shared_institution")
    ) {
      warnings.push("blind_review_institution_overlap")
      riskScore += 18
    }

    if ((assignment.reputationWeight ?? 0) >= 0.25) {
      warnings.push("high_reputation_weight")
      riskScore += findings.length > 0 || blockers.length > 0 ? 12 : 4
    }

    if (
      project.highImpactReputationWeight &&
      /leaderboard|project/.test(assignment.publicImpact ?? "")
    ) {
      warnings.push("public_reputation_surface")
      riskScore += 8
    }

    if (assignment.mode !== project.anonymousReviewMode && assignment.mode !== "public") {
      warnings.push("mode_mismatch")
      riskScore += 8
    }

    const dedupedBlockers = [...new Set(blockers)]
    const dedupedWarnings = [...new Set(warnings)]
    const severity =
      riskScore >= 80 ||
      dedupedBlockers.includes("reviewer_inactive") ||
      dedupedBlockers.some((blocker) => blocker.startsWith("hard_conflict"))
        ? "critical"
        : riskScore >= 45
          ? "high"
          : riskScore >= 20
            ? "medium"
            : "low"
    const decision =
      dedupedBlockers.some((blocker) =>
        /reviewer_missing|reviewer_inactive|hard_conflict/.test(blocker),
      ) || riskScore >= 80
        ? "recuse"
        : riskScore >= 30
          ? "steward_review"
          : "allow"

    if (decision === "recuse") {
      stewardQueue.push(
        makeAction(
          assignment.id,
          severity,
          "replace_reviewer",
          `${anonymizedReviewerLabel(assignment.reviewerId)} should be recused before review credit or reputation impact is recorded.`,
        ),
      )
    } else if (decision === "steward_review") {
      stewardQueue.push(
        makeAction(
          assignment.id,
          severity,
          "steward_review_required",
          `${anonymizedReviewerLabel(assignment.reviewerId)} needs conflict steward review before assignment is released.`,
        ),
      )
    }

    decisions.push({
      assignmentId: assignment.id,
      reviewerId: assignment.reviewerId,
      reviewerLabel: anonymizedReviewerLabel(assignment.reviewerId),
      reviewType: assignment.reviewType,
      mode: assignment.mode,
      decision,
      severity,
      riskScore,
      reputationWeight: assignment.reputationWeight,
      publicImpact: assignment.publicImpact,
      blockers: dedupedBlockers,
      warnings: dedupedWarnings,
      findings,
      auditDigest: digestRecord({
        assignmentId: assignment.id,
        reviewerId: assignment.reviewerId,
        decision,
        severity,
        riskScore,
        blockers: dedupedBlockers,
        warnings: dedupedWarnings,
        findings,
      }),
    })
  }

  const summary = {
    projectId: project.id,
    totalAssignments: decisions.length,
    allow: decisions.filter((decision) => decision.decision === "allow").length,
    stewardReview: decisions.filter((decision) => decision.decision === "steward_review").length,
    recuse: decisions.filter((decision) => decision.decision === "recuse").length,
    criticalFindings: decisions.filter((decision) => decision.severity === "critical").length,
    reputationWeightAtRisk: Number(
      decisions
        .filter((decision) => decision.decision !== "allow")
        .reduce((sum, decision) => sum + (decision.reputationWeight ?? 0), 0)
        .toFixed(2),
    ),
    anonymousMode: project.anonymousReviewMode,
  }

  return {
    generatedAt: packet.generatedAt,
    project: {
      id: project.id,
      title: project.title,
      domain: project.domain,
      anonymousReviewMode: project.anonymousReviewMode,
    },
    summary,
    decisions,
    stewardQueue,
    packetDigest: digestRecord({
      generatedAt: packet.generatedAt,
      project,
      assignments: packet.assignments,
      relationships: packet.relationships,
    }),
  }
}

export function renderStewardPacketMarkdown(result) {
  const lines = [
    "# Peer Review Recusal Steward Packet",
    "",
    `Project: ${result.project.title}`,
    `Generated: ${result.generatedAt}`,
    `Packet digest: ${result.packetDigest}`,
    "",
    "## Summary",
    "",
    `- Assignments evaluated: ${result.summary.totalAssignments}`,
    `- Allowed: ${result.summary.allow}`,
    `- Steward review: ${result.summary.stewardReview}`,
    `- Recused: ${result.summary.recuse}`,
    `- Reputation weight at risk: ${formatPercent(result.summary.reputationWeightAtRisk)}`,
    "",
    "## Decisions",
    "",
  ]

  for (const decision of result.decisions) {
    lines.push(
      `### ${decision.assignmentId} - ${decision.decision}`,
      "",
      `- Reviewer: ${decision.reviewerLabel}`,
      `- Review type: ${decision.reviewType}`,
      `- Mode: ${decision.mode}`,
      `- Severity: ${decision.severity}`,
      `- Risk score: ${decision.riskScore}`,
      `- Public impact: ${decision.publicImpact}`,
      `- Blockers: ${decision.blockers.length ? decision.blockers.join(", ") : "none"}`,
      `- Warnings: ${decision.warnings.length ? decision.warnings.join(", ") : "none"}`,
      `- Audit digest: ${decision.auditDigest}`,
      "",
    )
    if (decision.findings.length > 0) {
      lines.push("Evidence:")
      for (const finding of decision.findings) {
        lines.push(
          `- ${finding.type} with ${finding.authorId}: ${finding.severity}; ${finding.evidence}`,
        )
      }
      lines.push("")
    }
  }

  lines.push("## Steward Queue", "")
  for (const action of result.stewardQueue) {
    lines.push(`- ${action.severity}: ${action.code} for ${action.assignmentId}`)
  }

  return `${lines.join("\n")}\n`
}

export function renderSummarySvg(result) {
  const decisionRows = result.decisions
    .map((decision, index) => {
      const y = 158 + index * 38
      const color =
        decision.decision === "allow"
          ? "#117865"
          : decision.decision === "steward_review"
            ? "#b45309"
            : "#b91c1c"
      return `<g><rect x="54" y="${y - 23}" width="852" height="30" rx="4" fill="${color}" opacity="0.88"/><text x="72" y="${y}" fill="#ffffff" font-size="17">${decision.assignmentId}: ${decision.decision} (${decision.riskScore})</text></g>`
    })
    .join("")

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="420" viewBox="0 0 960 420">
  <rect width="960" height="420" fill="#111827"/>
  <rect x="32" y="32" width="896" height="356" rx="8" fill="#1f2937"/>
  <text x="54" y="78" fill="#ffffff" font-size="30" font-family="Arial, sans-serif" font-weight="700">Peer Review Recusal Guard</text>
  <text x="54" y="108" fill="#d1d5db" font-size="17" font-family="Arial, sans-serif">Pre-review conflict screening for community reputation integrity</text>
  <text x="54" y="134" fill="#a7f3d0" font-size="17" font-family="Arial, sans-serif">allow ${result.summary.allow} | steward ${result.summary.stewardReview} | recuse ${result.summary.recuse} | weight at risk ${formatPercent(result.summary.reputationWeightAtRisk)}</text>
  ${decisionRows}
</svg>
`
}
