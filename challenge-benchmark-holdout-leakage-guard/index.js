const crypto = require("node:crypto")

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

function hoursBetween(a, b) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3600000
}

function finding(code, severity, message, detail = {}) {
  return { code, severity, message, detail }
}

function action(code, owner, message) {
  return { code, owner, message }
}

function evaluateChallenge(challenge, policy) {
  const findings = []
  const holdoutHashes = new Set()
  const holdoutPaths = new Set(challenge.holdoutArtifacts.map((artifact) => artifact.path))

  for (const artifact of challenge.holdoutArtifacts) {
    if (!artifact.hash || artifact.hash.length < policy.minHoldoutHashLength) {
      findings.push(finding("HOLDOUT_HASH_MISSING", "blocker", "Holdout artifact needs a stable hash before scoring can start.", {
        artifactId: artifact.id,
        path: artifact.path,
      }))
      continue
    }
    holdoutHashes.add(artifact.hash)
  }

  for (const event of challenge.releaseEvents) {
    if (!policy.allowedReleaseChannels.includes(event.channel)) {
      findings.push(finding("HOLDOUT_RELEASED_TO_PUBLIC_CHANNEL", "blocker", "Holdout artifact was released through a non-scoring channel.", {
        artifactId: event.artifactId,
        channel: event.channel,
        at: event.at,
        actor: event.actor,
      }))
    }

    if (new Date(event.at) < new Date(challenge.submissionDeadline)) {
      findings.push(finding("HOLDOUT_RELEASED_BEFORE_DEADLINE", "blocker", "Holdout release happened before the submission deadline.", {
        artifactId: event.artifactId,
        channel: event.channel,
        at: event.at,
        submissionDeadline: challenge.submissionDeadline,
      }))
    }
  }

  for (const grant of challenge.solverWorkspaceGrants) {
    const leakedPaths = grant.paths.filter((path) => holdoutPaths.has(path))
    if (leakedPaths.length > 0 && new Date(grant.grantedAt) < new Date(challenge.submissionDeadline)) {
      findings.push(finding("SOLVER_WORKSPACE_HOLDOUT_GRANT", "blocker", "Solver workspace received holdout paths before the deadline.", {
        solverId: grant.solverId,
        leakedPaths,
        grantedAt: grant.grantedAt,
      }))
    }
  }

  for (const baseline of challenge.publicBaselines) {
    if (holdoutHashes.has(baseline.hash)) {
      findings.push(finding("PUBLIC_BASELINE_HASH_OVERLAP", "blocker", "A public baseline artifact matches the sealed holdout hash.", {
        baselineId: baseline.id,
        channel: baseline.channel,
        hash: baseline.hash,
      }))
    }
  }

  for (const exception of challenge.sponsorExceptions) {
    const hoursToDeadline = hoursBetween(exception.approvedAt || challenge.submissionDeadline, challenge.submissionDeadline)
    if (!exception.approved) {
      findings.push(finding("UNAPPROVED_SPONSOR_EXCEPTION", "warning", "Sponsor exception was logged but not approved before scoring.", {
        exceptionId: exception.id,
        artifactId: exception.artifactId,
        reason: exception.reason,
      }))
      continue
    }
    if (hoursToDeadline <= policy.freezeWindowHours) {
      findings.push(finding("LATE_SPONSOR_EXCEPTION_REVIEW", "warning", "Approved sponsor exception landed inside the benchmark freeze window.", {
        exceptionId: exception.id,
        artifactId: exception.artifactId,
        approvedAt: exception.approvedAt,
        freezeWindowHours: policy.freezeWindowHours,
      }))
    }
  }

  for (const submission of challenge.submissions) {
    const overlappingHashes = submission.artifactHashes.filter((hash) => holdoutHashes.has(hash))
    if (overlappingHashes.length > 0) {
      findings.push(finding("SUBMISSION_CONTAINS_HOLDOUT_HASH", "blocker", "Submission package contains an artifact hash matching the sealed holdout.", {
        solverId: submission.solverId,
        submittedAt: submission.submittedAt,
        overlappingHashes,
      }))
    }
  }

  const blockers = findings.filter((item) => item.severity === "blocker")
  const warnings = findings.filter((item) => item.severity === "warning")
  const status = blockers.length > 0 ? "quarantine" : (warnings.length > 0 ? "review" : "score")

  const decision = {
    id: challenge.id,
    title: challenge.title,
    status,
    holdoutArtifacts: challenge.holdoutArtifacts.length,
    releaseEvents: challenge.releaseEvents.length,
    solverWorkspaceGrants: challenge.solverWorkspaceGrants.length,
    publicBaselines: challenge.publicBaselines.length,
    submissions: challenge.submissions.length,
    findings,
    scoringActions: buildScoringActions(status, findings),
  }

  return {
    ...decision,
    auditDigest: digestFor(decision),
  }
}

function buildScoringActions(status, findings) {
  if (status === "score") {
    return [action("RELEASE_TO_SCORING", "scoring-admin", "Proceed with sealed evaluator scoring.")]
  }

  const actions = []
  for (const item of findings) {
    if (item.severity === "blocker") {
      actions.push(action(`QUARANTINE_${item.code}`, "challenge-ops", item.message))
    } else {
      actions.push(action(`REVIEW_${item.code}`, "sponsor-reviewer", item.message))
    }
  }

  if (status === "quarantine") {
    actions.push(action("FREEZE_LEADERBOARD", "challenge-ops", "Freeze leaderboard publication until leakage review is resolved."))
  }

  return [...new Map(actions.map((item) => [item.code, item])).values()]
}

function evaluateChallengePortfolio({ challenges, leakagePolicy }) {
  const decisions = challenges.map((challenge) => evaluateChallenge(challenge, leakagePolicy))
  const summary = {
    totalChallenges: decisions.length,
    score: decisions.filter((decision) => decision.status === "score").length,
    review: decisions.filter((decision) => decision.status === "review").length,
    quarantine: decisions.filter((decision) => decision.status === "quarantine").length,
    scoringActions: decisions.reduce((sum, decision) => sum + decision.scoringActions.length, 0),
  }

  return {
    generatedAt: "2026-05-21T14:25:00.000Z",
    policy: leakagePolicy,
    summary,
    decisions,
    audit: {
      source: "synthetic-challenge-benchmark-leakage-review",
      digest: digestFor({ summary, decisions }),
    },
  }
}

module.exports = {
  evaluateChallenge,
  evaluateChallengePortfolio,
}
