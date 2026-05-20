const crypto = require("crypto")

const BLOCKING_CODES = new Set(["SPONSOR_CONFLICT", "NDA_REQUIRED", "IDENTITY_ATTESTATION_MISSING"])

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

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex")
}

function hmacSha256(secret, value) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex")
}

function addFinding(findings, severity, code, message, evidence = {}) {
  findings.push({ severity, code, message, evidence })
}

function unique(values) {
  return [...new Set(values)]
}

function calculateExpertiseFit(team, challenge) {
  const teamSkills = new Map(team.skills.map((skill) => [skill.name, skill.level]))
  const matched = []
  const missing = []

  let earned = 0
  let possible = 0

  for (const requirement of challenge.requiredExpertise) {
    possible += requirement.weight
    const level = teamSkills.get(requirement.name) || 0
    const contribution = Math.min(level / requirement.minimumLevel, 1) * requirement.weight
    earned += contribution

    if (level >= requirement.minimumLevel) {
      matched.push({ name: requirement.name, level, required: requirement.minimumLevel })
    } else {
      missing.push({ name: requirement.name, level, required: requirement.minimumLevel })
    }
  }

  return {
    score: possible === 0 ? 100 : Math.round((earned / possible) * 100),
    matched,
    missing,
  }
}

function hasSponsorConflict(team, challenge, policy) {
  const sponsorKeys = new Set([challenge.sponsorId, ...challenge.sponsorAliases].map((value) => value.toLowerCase()))
  return team.members.flatMap((member) => member.affiliations).some((affiliation) => {
    const normalizedOrg = affiliation.org.toLowerCase()
    const isSponsor = sponsorKeys.has(normalizedOrg)
    const isRecent = affiliation.monthsSinceEnd === null || affiliation.monthsSinceEnd <= policy.conflictLookbackMonths
    return isSponsor && isRecent
  })
}

function buildReviewerPacket(team, challenge, expertiseFit, findings, policy) {
  const memberRoles = team.members.map((member) => ({
    alias: member.alias,
    role: member.role,
    identityAttested: member.identityAttested,
    ndaVersion: member.ndaVersion || null,
  }))

  const packet = {
    teamId: team.id,
    displayName: challenge.participationMode === "anonymous" ? team.anonymousHandle : team.displayName,
    identityHash: sha256(
      stableStringify(team.members.map((member) => ({ alias: member.alias, email: member.email })).sort((a, b) => a.alias.localeCompare(b.alias))),
    ),
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    participationMode: challenge.participationMode,
    expertiseFit,
    availabilityHoursPerWeek: team.availabilityHoursPerWeek,
    activeSubmissions: team.activeSubmissions,
    memberRoles,
    findings,
    checklist: buildChecklist(team, challenge, expertiseFit, findings, policy),
  }

  return packet
}

function buildChecklist(team, challenge, expertiseFit, findings, policy) {
  return [
    {
      item: "Required expertise threshold met",
      complete: expertiseFit.score >= challenge.minimumExpertiseScore,
    },
    {
      item: "Availability supports milestone cadence",
      complete: team.availabilityHoursPerWeek >= challenge.minimumAvailabilityHoursPerWeek,
    },
    {
      item: "All members completed identity attestation",
      complete: team.members.every((member) => member.identityAttested),
    },
    {
      item: "NDA version current when required",
      complete: !challenge.requiresNda || team.members.every((member) => member.ndaVersion === policy.requiredNdaVersion),
    },
    {
      item: "No recent sponsor conflict detected",
      complete: !findings.some((finding) => finding.code === "SPONSOR_CONFLICT"),
    },
    {
      item: "Team workload under active submission limit",
      complete: team.activeSubmissions < policy.maxActiveSubmissions,
    },
  ]
}

function evaluateTeamForChallenge(team, challenge, policy) {
  const findings = []
  const expertiseFit = calculateExpertiseFit(team, challenge)

  if (expertiseFit.score < challenge.minimumExpertiseScore) {
    addFinding(findings, "high", "EXPERTISE_GAP", "Team expertise score is below the challenge threshold.", {
      score: expertiseFit.score,
      threshold: challenge.minimumExpertiseScore,
      missing: expertiseFit.missing.map((skill) => skill.name),
    })
  }

  if (team.availabilityHoursPerWeek < challenge.minimumAvailabilityHoursPerWeek) {
    addFinding(findings, "medium", "AVAILABILITY_GAP", "Team availability is below the milestone cadence requirement.", {
      availableHours: team.availabilityHoursPerWeek,
      requiredHours: challenge.minimumAvailabilityHoursPerWeek,
    })
  }

  if (team.activeSubmissions >= policy.maxActiveSubmissions) {
    addFinding(findings, "medium", "ACTIVE_SUBMISSION_LIMIT", "Team is already carrying too many active bounty submissions.", {
      activeSubmissions: team.activeSubmissions,
      limit: policy.maxActiveSubmissions,
    })
  }

  if (team.members.length > challenge.maxTeamSize) {
    addFinding(findings, "medium", "TEAM_SIZE_LIMIT", "Team exceeds the challenge team size limit.", {
      teamSize: team.members.length,
      maxTeamSize: challenge.maxTeamSize,
    })
  }

  const missingAttestations = team.members.filter((member) => !member.identityAttested).map((member) => member.alias)
  if (missingAttestations.length > 0) {
    addFinding(findings, "critical", "IDENTITY_ATTESTATION_MISSING", "All solver members must complete identity attestation before private challenge access.", {
      members: missingAttestations,
    })
  }

  if (challenge.requiresNda) {
    const missingNda = team.members
      .filter((member) => member.ndaVersion !== policy.requiredNdaVersion)
      .map((member) => member.alias)
    if (missingNda.length > 0) {
      addFinding(findings, "critical", "NDA_REQUIRED", "Challenge requires the current NDA before workspace access.", {
        requiredVersion: policy.requiredNdaVersion,
        members: missingNda,
      })
    }
  }

  if (hasSponsorConflict(team, challenge, policy)) {
    addFinding(findings, "critical", "SPONSOR_CONFLICT", "Recent sponsor affiliation creates a conflict for this private challenge.", {
      sponsorId: challenge.sponsorId,
      lookbackMonths: policy.conflictLookbackMonths,
    })
  }

  if (challenge.participationMode === "anonymous" && !team.anonymousHandle) {
    addFinding(findings, "medium", "ANONYMOUS_HANDLE_MISSING", "Anonymous challenge participation requires a solver-safe public handle.", {
      teamId: team.id,
    })
  }

  const blockers = findings.filter((finding) => BLOCKING_CODES.has(finding.code))
  const highFindings = findings.filter((finding) => finding.severity === "high")
  const decision = blockers.length > 0 ? "blocked" : highFindings.length > 0 || findings.length > 0 ? "needs-review" : "approved"
  const workspaceAccess = decision === "approved" ? "grant-private-workspace" : decision === "needs-review" ? "hold-for-coordinator-review" : "deny-until-remediated"

  const reviewerPacket = buildReviewerPacket(team, challenge, expertiseFit, findings, policy)
  const event = {
    type: "bounty.solver_prequalification.evaluated",
    challengeId: challenge.id,
    teamId: team.id,
    decision,
    workspaceAccess,
    findingCodes: findings.map((finding) => finding.code),
    generatedAt: policy.asOf,
  }

  return {
    challengeId: challenge.id,
    teamId: team.id,
    displayName: reviewerPacket.displayName,
    decision,
    workspaceAccess,
    expertiseScore: expertiseFit.score,
    findings,
    reviewerPacket,
    auditDigest: sha256(stableStringify({ team, challenge, findings })),
    signedEvent: {
      ...event,
      signature: `sha256=${hmacSha256(policy.webhookSecret, stableStringify(event))}`,
    },
  }
}

function generateSolverPrequalificationQueue(challenges, teams, policy) {
  const evaluations = teams.flatMap((team) =>
    team.appliedChallengeIds.map((challengeId) => {
      const challenge = challenges.find((candidate) => candidate.id === challengeId)
      if (!challenge) {
        throw new Error(`Unknown challenge ${challengeId} for team ${team.id}`)
      }
      return evaluateTeamForChallenge(team, challenge, policy)
    }),
  )

  const summary = evaluations.reduce(
    (acc, evaluation) => {
      acc[evaluation.decision] += 1
      acc.total += 1
      if (evaluation.workspaceAccess === "grant-private-workspace") acc.workspaceGrants += 1
      return acc
    },
    { approved: 0, "needs-review": 0, blocked: 0, total: 0, workspaceGrants: 0 },
  )

  const challengeQueues = challenges.map((challenge) => ({
    challengeId: challenge.id,
    title: challenge.title,
    prizeUsd: challenge.prizeUsd,
    participationMode: challenge.participationMode,
    candidates: evaluations
      .filter((evaluation) => evaluation.challengeId === challenge.id)
      .sort((a, b) => b.expertiseScore - a.expertiseScore || a.teamId.localeCompare(b.teamId))
      .map((evaluation) => ({
        teamId: evaluation.teamId,
        displayName: evaluation.displayName,
        decision: evaluation.decision,
        workspaceAccess: evaluation.workspaceAccess,
        expertiseScore: evaluation.expertiseScore,
        findingCodes: unique(evaluation.findings.map((finding) => finding.code)),
      })),
  }))

  return {
    generatedAt: policy.asOf,
    module: "solver-prequalification-queue",
    summary,
    challengeQueues,
    evaluations,
    auditDigest: sha256(stableStringify(evaluations)),
  }
}

module.exports = {
  calculateExpertiseFit,
  evaluateTeamForChallenge,
  generateSolverPrequalificationQueue,
  stableStringify,
  sha256,
  hmacSha256,
}
