"use strict"

const crypto = require("node:crypto")

const REQUIRED_FIELDS = [
  "title",
  "scientificContext",
  "problemStatement",
  "deliverables",
  "evaluationRubric",
  "timeline",
  "prize",
]

const REQUIRED_TIMELINE_KEYS = ["openAt", "submissionDue", "reviewDue", "awardDue"]

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

function hasText(value, minLength = 1) {
  return typeof value === "string" && value.trim().length >= minLength
}

function asDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function unique(values) {
  return [...new Set(values)]
}

function evaluateChallengePosting(input) {
  const challenge = input || {}
  const blockers = []
  const warnings = []
  const actions = []
  const evidence = []

  for (const field of REQUIRED_FIELDS) {
    const value = challenge[field]
    if (Array.isArray(value) ? value.length === 0 : value == null || value === "") {
      blockers.push(`missing required field: ${field}`)
    }
  }

  if (!hasText(challenge.scientificContext, 120)) {
    warnings.push("scientific context is too thin for external solvers")
  } else {
    evidence.push("scientific context is solver-readable")
  }

  if (!hasText(challenge.problemStatement, 80)) {
    blockers.push("problem statement needs a concrete scientific task")
  } else {
    evidence.push("problem statement describes a concrete task")
  }

  const deliverables = challenge.deliverables || []
  const deliverableIds = deliverables.map((item) => item.id).filter(Boolean)
  for (const deliverable of deliverables) {
    if (!hasText(deliverable.name)) blockers.push(`deliverable ${deliverable.id || "unknown"} has no name`)
    if (!hasText(deliverable.acceptanceEvidence)) {
      blockers.push(`deliverable ${deliverable.id || deliverable.name || "unknown"} lacks acceptance evidence`)
    }
    if (!hasText(deliverable.fileFormat)) {
      warnings.push(`deliverable ${deliverable.id || deliverable.name || "unknown"} has no expected file format`)
    }
  }
  if (deliverableIds.length !== unique(deliverableIds).length) {
    blockers.push("deliverable IDs must be unique")
  }

  const rubric = challenge.evaluationRubric || []
  const totalWeight = rubric.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0)
  if (rubric.length < 3) blockers.push("evaluation rubric needs at least three criteria")
  if (totalWeight !== 100) blockers.push(`evaluation rubric weights must total 100, got ${totalWeight}`)
  for (const criterion of rubric) {
    if (!hasText(criterion.name)) blockers.push("rubric criterion is missing a name")
    if (!hasText(criterion.measurement)) {
      blockers.push(`rubric criterion ${criterion.name || "unknown"} lacks a measurable standard`)
    }
    if (criterion.deliverableId && !deliverableIds.includes(criterion.deliverableId)) {
      blockers.push(`rubric criterion ${criterion.name || "unknown"} references an unknown deliverable`)
    }
  }

  const timeline = challenge.timeline || {}
  const timelineDates = REQUIRED_TIMELINE_KEYS.map((key) => [key, asDate(timeline[key])])
  for (const [key, date] of timelineDates) {
    if (!date) blockers.push(`timeline ${key} is missing or invalid`)
  }
  const validDates = timelineDates.every(([, date]) => date)
  if (validDates) {
    for (let i = 1; i < timelineDates.length; i += 1) {
      const [previousKey, previousDate] = timelineDates[i - 1]
      const [currentKey, currentDate] = timelineDates[i]
      if (currentDate <= previousDate) {
        blockers.push(`timeline ${currentKey} must be after ${previousKey}`)
      }
    }
    evidence.push("timeline is chronological")
  }

  const prize = challenge.prize || {}
  const prizeAmount = Number(prize.amount || 0)
  if (!Number.isFinite(prizeAmount) || prizeAmount <= 0) blockers.push("prize amount must be positive")
  if (!hasText(prize.currency)) blockers.push("prize currency is required")

  const payouts = challenge.payoutMilestones || []
  const payoutTotal = payouts.reduce((sum, payout) => sum + Number(payout.amount || 0), 0)
  if (payouts.length === 0) {
    blockers.push("payout milestones are required")
  } else if (payoutTotal !== prizeAmount) {
    blockers.push(`payout milestones must total prize amount ${prizeAmount}, got ${payoutTotal}`)
  } else {
    evidence.push("payout milestones reconcile to the prize amount")
  }
  for (const payout of payouts) {
    if (!hasText(payout.trigger)) blockers.push("payout milestone is missing a trigger")
  }

  const sensitive = Boolean(challenge.privateChallenge || challenge.requiresNda)
  if (sensitive && !challenge.ndaPlan) blockers.push("private or NDA challenge needs an NDA plan")
  if (sensitive && !challenge.prequalification) {
    warnings.push("sensitive challenge should define prequalification criteria")
  }

  if (!challenge.sponsorContact || !hasText(challenge.sponsorContact.role)) {
    warnings.push("sponsor contact role is missing")
  }
  if (!challenge.ipPolicy || !hasText(challenge.ipPolicy.defaultLicense)) {
    warnings.push("IP/license policy should be explicit before posting")
  }
  if (!challenge.submissionPrivacy || !hasText(challenge.submissionPrivacy.visibility)) {
    warnings.push("submission visibility is not specified")
  }

  if (blockers.length > 0) {
    actions.push("Resolve blockers before accepting the challenge posting.")
  }
  if (warnings.length > 0) {
    actions.push("Tighten warning items before sponsor approval.")
  }
  actions.push("Attach this readiness packet to the challenge posting review.")

  const possibleChecks = 16
  const penalty = blockers.length * 3 + warnings.length
  const readinessScore = Math.max(0, Math.min(100, Math.round(((possibleChecks * 3 - penalty) / (possibleChecks * 3)) * 100)))
  const status = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "needs-review" : "ready"

  const result = {
    challengeId: challenge.id || null,
    title: challenge.title || "Untitled challenge",
    status,
    readinessScore,
    blockers,
    warnings,
    evidence,
    actions,
    rubricWeightTotal: totalWeight,
    payoutTotal,
    deliverableCount: deliverables.length,
  }

  return {
    ...result,
    auditDigest: digest(result),
  }
}

module.exports = {
  evaluateChallengePosting,
}
