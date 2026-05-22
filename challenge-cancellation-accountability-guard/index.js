import { createHash } from "node:crypto"

const cents = (value) => Number(value ?? 0)
const daysBetween = (start, end) =>
  Math.max(0, (Date.parse(end) - Date.parse(start)) / 86400000)

const digestFor = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex")

const severityRank = { critical: 3, warning: 2, info: 1 }

const addFinding = (findings, severity, code, challengeId, message, evidence = {}) => {
  findings.push({ severity, code, challengeId, message, evidence })
}

const reviewComplete = (solver, requiredFields) => {
  if (!solver.reviewRecord) return false
  return requiredFields.every((field) => solver.reviewRecord[field] != null)
}

export function evaluateChallengeCancellations(challenges, policy) {
  const findings = []
  const challengeSummaries = []

  for (const challenge of challenges) {
    const solverCount = challenge.solvers.length
    const notifiedCount = challenge.solvers.filter((solver) => solver.notificationSentAt).length
    const reviewedCount = challenge.solvers.filter((solver) =>
      reviewComplete(solver, policy.requiredNoAwardReviewFields),
    ).length
    const ipSafeCount = challenge.solvers.filter((solver) =>
      policy.solverKeepsIpUntilSettlement
        ? solver.ipState === "solver_retained"
        : solver.ipState !== "unknown",
    ).length
    const reasonEvidence = new Set(challenge.reason.evidence ?? [])
    const missingReasonEvidence = policy.requiredReasonEvidence.filter(
      (item) => !reasonEvidence.has(item),
    )
    const workAgeDays = daysBetween(challenge.workStartedAt, challenge.decisionAt)
    const appealWindowDays = daysBetween(challenge.decisionAt, challenge.appealWindowClosesAt)
    const minimumCompensationCents = Math.round(
      cents(challenge.escrow.fundedCents) * policy.compensationFloorPct,
    )
    const compensationShortfallCents = Math.max(
      0,
      minimumCompensationCents - cents(challenge.escrow.compensationReleasedCents),
    )
    const refundBeforeAppeal =
      policy.refundBlockedUntilAppealWindowCloses &&
      cents(challenge.escrow.refundRequestedCents) > 0 &&
      appealWindowDays < policy.minimumAppealWindowDays

    if (workAgeDays > 0 && missingReasonEvidence.length > 0) {
      addFinding(
        findings,
        "critical",
        "missing_cancellation_reason_evidence",
        challenge.id,
        "Cancellation/no-award decision is missing required sponsor, review, or finance evidence.",
        { missingReasonEvidence },
      )
    }

    if (notifiedCount !== solverCount) {
      addFinding(
        findings,
        "critical",
        "solver_notification_gap",
        challenge.id,
        "Not every solver team has a cancellation/no-award notice before escrow or IP decisions.",
        { solverCount, notifiedCount },
      )
    }

    if (challenge.status === "no_award" && reviewedCount !== solverCount) {
      addFinding(
        findings,
        "critical",
        "missing_no_award_review_records",
        challenge.id,
        "No-award decision lacks complete per-solver review records.",
        { solverCount, reviewedCount },
      )
    }

    if (compensationShortfallCents > 0) {
      addFinding(
        findings,
        "warning",
        "partial_work_compensation_shortfall",
        challenge.id,
        "Released compensation is below the configured floor for started solver work.",
        { minimumCompensationCents, releasedCents: challenge.escrow.compensationReleasedCents },
      )
    }

    if (refundBeforeAppeal) {
      addFinding(
        findings,
        "critical",
        "refund_requested_before_appeal_window",
        challenge.id,
        "Sponsor refund is requested before the minimum appeal window has elapsed.",
        { appealWindowDays, refundRequestedCents: challenge.escrow.refundRequestedCents },
      )
    }

    if (ipSafeCount !== solverCount) {
      addFinding(
        findings,
        "critical",
        "solver_ip_not_retained",
        challenge.id,
        "Solver IP is exposed or transferred before settlement and cancellation close.",
        { solverCount, ipSafeCount },
      )
    }

    if (appealWindowDays < policy.minimumAppealWindowDays) {
      addFinding(
        findings,
        "warning",
        "appeal_window_too_short",
        challenge.id,
        "Appeal window is shorter than the configured minimum.",
        { appealWindowDays, minimumAppealWindowDays: policy.minimumAppealWindowDays },
      )
    }

    const blockerCodes = findings
      .filter((finding) => finding.challengeId === challenge.id && finding.severity === "critical")
      .map((finding) => finding.code)
    const warningCodes = findings
      .filter((finding) => finding.challengeId === challenge.id && finding.severity === "warning")
      .map((finding) => finding.code)

    challengeSummaries.push({
      id: challenge.id,
      title: challenge.title,
      decision: blockerCodes.length > 0 ? "hold_cancellation" : "ready_for_close",
      solverCount,
      notifiedCount,
      reviewedCount,
      ipSafeCount,
      fundedCents: challenge.escrow.fundedCents,
      compensationReleasedCents: challenge.escrow.compensationReleasedCents,
      compensationShortfallCents,
      appealWindowDays,
      blockerCodes,
      warningCodes,
    })
  }

  const criticalCount = findings.filter((finding) => finding.severity === "critical").length
  const warningCount = findings.filter((finding) => finding.severity === "warning").length
  const heldChallenges = challengeSummaries.filter(
    (summary) => summary.decision === "hold_cancellation",
  ).length
  const totalFundedCents = challengeSummaries.reduce(
    (total, summary) => total + summary.fundedCents,
    0,
  )
  const compensationShortfallCents = challengeSummaries.reduce(
    (total, summary) => total + summary.compensationShortfallCents,
    0,
  )
  const auditDigest = digestFor({ challengeSummaries, findings })

  return {
    status: criticalCount > 0 ? "hold_cancellation_close" : "ready_for_close",
    totals: {
      challenges: challenges.length,
      heldChallenges,
      readyChallenges: challenges.length - heldChallenges,
      solverTeams: challengeSummaries.reduce((total, summary) => total + summary.solverCount, 0),
      totalFundedCents,
      compensationShortfallCents,
      criticalCount,
      warningCount,
    },
    challengeSummaries,
    findings: findings.sort(
      (a, b) => severityRank[b.severity] - severityRank[a.severity] || a.code.localeCompare(b.code),
    ),
    auditDigest,
  }
}
