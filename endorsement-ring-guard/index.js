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

function normalizeEndorsement(item) {
  return {
    from: item.from,
    to: item.to,
    projectId: item.projectId || null,
    evidenceId: item.evidenceId || null,
    relationship: item.relationship || "unknown",
    institution: item.institution || null,
    weight: Number(item.weight || 1),
  }
}

function pairKey(a, b) {
  return [a, b].sort().join("::")
}

function analyzeEndorsements(input) {
  const endorsements = (input.endorsements || []).map(normalizeEndorsement)
  const evidenceIds = new Set((input.evidence || []).map((item) => item.id))
  const users = new Map((input.users || []).map((user) => [user.id, user]))
  const blockers = []
  const warnings = []
  const holds = []
  const reviewerActions = []

  const byPair = new Map()
  const inboundByUser = new Map()

  for (const endorsement of endorsements) {
    if (!endorsement.from || !endorsement.to) {
      blockers.push("endorsement is missing source or target user")
      continue
    }
    if (endorsement.from === endorsement.to) {
      holds.push({
        type: "self-endorsement",
        user: endorsement.from,
        reason: "self endorsements cannot contribute to reputation",
      })
    }
    if (!users.has(endorsement.from)) warnings.push(`unknown endorsing user: ${endorsement.from}`)
    if (!users.has(endorsement.to)) warnings.push(`unknown endorsed user: ${endorsement.to}`)
    if (!endorsement.evidenceId || !evidenceIds.has(endorsement.evidenceId)) {
      holds.push({
        type: "missing-evidence",
        from: endorsement.from,
        to: endorsement.to,
        reason: "endorsement lacks accepted review, code, dataset, or reproducibility evidence",
      })
    }
    if (endorsement.weight <= 0 || endorsement.weight > 5) {
      blockers.push(`endorsement ${endorsement.from}->${endorsement.to} has invalid weight`)
    }

    const pair = pairKey(endorsement.from, endorsement.to)
    byPair.set(pair, [...(byPair.get(pair) || []), endorsement])
    inboundByUser.set(endorsement.to, [...(inboundByUser.get(endorsement.to) || []), endorsement])
  }

  for (const [pair, pairEndorsements] of byPair.entries()) {
    const directions = new Set(pairEndorsements.map((item) => `${item.from}->${item.to}`))
    if (directions.size > 1) {
      holds.push({
        type: "reciprocal-endorsement",
        pair,
        reason: "mutual endorsements require independent evidence before reputation credit",
      })
    }
  }

  for (const [target, inbound] of inboundByUser.entries()) {
    const institutionCounts = inbound.reduce((counts, endorsement) => {
      const institution = endorsement.institution || users.get(endorsement.from)?.institution || "unknown"
      counts.set(institution, (counts.get(institution) || 0) + 1)
      return counts
    }, new Map())
    const dominant = [...institutionCounts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (dominant && inbound.length >= 3 && dominant[1] / inbound.length > 0.67) {
      holds.push({
        type: "institution-concentration",
        user: target,
        institution: dominant[0],
        reason: "endorsements are too concentrated in one institution",
      })
    }
  }

  const accepted = endorsements.filter((endorsement) => {
    const hasHold = holds.some(
      (hold) =>
        (hold.from === endorsement.from && hold.to === endorsement.to) ||
        hold.user === endorsement.from ||
        hold.user === endorsement.to ||
        hold.pair === pairKey(endorsement.from, endorsement.to),
    )
    return !hasHold && endorsement.evidenceId && evidenceIds.has(endorsement.evidenceId)
  })

  const scoreByUser = new Map()
  for (const endorsement of accepted) {
    scoreByUser.set(endorsement.to, (scoreByUser.get(endorsement.to) || 0) + endorsement.weight)
  }

  if (holds.length > 0) reviewerActions.push("Review held endorsements before updating reputation scores.")
  if (warnings.length > 0) reviewerActions.push("Resolve warning metadata before publishing leaderboard changes.")
  reviewerActions.push("Attach the audit digest to the reputation update packet.")

  const result = {
    status: blockers.length > 0 ? "blocked" : holds.length > 0 || warnings.length > 0 ? "needs-review" : "ready",
    acceptedCount: accepted.length,
    heldCount: holds.length,
    blockers,
    warnings: [...new Set(warnings)],
    holds,
    reputationDeltas: [...scoreByUser.entries()]
      .map(([userId, delta]) => ({ userId, delta }))
      .sort((a, b) => b.delta - a.delta || a.userId.localeCompare(b.userId)),
    reviewerActions,
  }

  return {
    ...result,
    auditDigest: digest(result),
  }
}

module.exports = {
  analyzeEndorsements,
}
