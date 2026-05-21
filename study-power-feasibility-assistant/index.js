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

function finding(code, severity, message, detail = {}) {
  return { code, severity, message, detail }
}

function getZAlpha(alpha, policy) {
  return policy.alphaByFamily[String(alpha)] ?? 1.96
}

function getZPower(targetPower, policy) {
  return policy.zPowerByTarget[String(targetPower)] ?? policy.zPowerByTarget[String(policy.targetPower)] ?? 0.84
}

function requiredContinuousN(claim, policy) {
  const zAlpha = getZAlpha(claim.alpha, policy)
  const zPower = getZPower(claim.targetPower, policy)
  const variance = claim.observedStandardDeviation ** 2
  const effect = Math.abs(claim.expectedEffectSize)

  if (effect <= 0) {
    return Number.POSITIVE_INFINITY
  }

  return Math.ceil((2 * (zAlpha + zPower) ** 2 * variance) / (effect ** 2))
}

function requiredBinaryN(claim, policy) {
  const zAlpha = getZAlpha(claim.alpha, policy)
  const zPower = getZPower(claim.targetPower, policy)
  const p1 = claim.baselineRate
  const p2 = claim.expectedRate
  const delta = Math.abs(p1 - p2)

  if (!Number.isFinite(delta) || delta <= 0) {
    return Number.POSITIVE_INFINITY
  }

  const pooled = (p1 + p2) / 2
  const pooledVariance = 2 * pooled * (1 - pooled)
  const armVariance = p1 * (1 - p1) + p2 * (1 - p2)
  return Math.ceil(((zAlpha * Math.sqrt(pooledVariance) + zPower * Math.sqrt(armVariance)) ** 2) / (delta ** 2))
}

function requiredPerGroup(claim, policy) {
  if (claim.outcomeType === "binary") {
    return requiredBinaryN(claim, policy)
  }
  return requiredContinuousN(claim, policy)
}

function estimateCoverageRatio(claim, requiredN) {
  if (!Number.isFinite(requiredN) || requiredN <= 0) {
    return 0
  }
  return Number((claim.sampleSizePerGroup / requiredN).toFixed(3))
}

function minimumDetectableContinuousEffect(claim, policy) {
  const zAlpha = getZAlpha(claim.alpha, policy)
  const zPower = getZPower(claim.targetPower, policy)
  const variance = claim.observedStandardDeviation ** 2
  return Math.sqrt((2 * (zAlpha + zPower) ** 2 * variance) / claim.sampleSizePerGroup)
}

function evaluatePreregistration(claim) {
  const findings = []
  if (!claim.preregistration.present) {
    findings.push(finding("PREREGISTRATION_MISSING", "blocker", "Power-sensitive confirmatory claim lacks preregistration evidence."))
    return findings
  }
  if (!claim.preregistration.outcomeDeclared) {
    findings.push(finding("OUTCOME_NOT_PREREGISTERED", "warning", "Primary outcome is not declared in the preregistration metadata."))
  }
  if (!claim.preregistration.analysisPlanDeclared) {
    findings.push(finding("ANALYSIS_PLAN_NOT_DECLARED", "warning", "Analysis plan is missing from preregistration metadata."))
  }
  return findings
}

function evaluateClaim(claim, policy) {
  const requiredN = requiredPerGroup(claim, policy)
  const coverageRatio = estimateCoverageRatio(claim, requiredN)
  const findings = []

  if (coverageRatio < policy.minPowerCoverageRatio) {
    findings.push(finding("UNDERPOWERED_CLAIM", coverageRatio < 0.45 ? "blocker" : "warning", "Claimed effect is not supported by the available sample size.", {
      sampleSizePerGroup: claim.sampleSizePerGroup,
      requiredPerGroup: requiredN,
      coverageRatio,
    }))
  }

  if (claim.outcomeType === "continuous") {
    const minimumDetectableEffect = minimumDetectableContinuousEffect(claim, policy)
    const effectCoverage = Number((Math.abs(claim.expectedEffectSize) / minimumDetectableEffect).toFixed(3))
    if (effectCoverage < policy.minDetectableEffectCoverage) {
      findings.push(finding("EFFECT_SIZE_TOO_SMALL_FOR_DESIGN", "warning", "Expected effect is below the design's detectable effect threshold.", {
        expectedEffectSize: claim.expectedEffectSize,
        minimumDetectableEffect: Number(minimumDetectableEffect.toFixed(3)),
        effectCoverage,
      }))
    }
  }

  if (claim.plannedComparisons > policy.maxUndisclosedTests && !claim.preregistration.analysisPlanDeclared) {
    findings.push(finding("MULTIPLE_TESTING_PLAN_MISSING", "warning", "Large comparison set needs an explicit multiplicity correction plan.", {
      plannedComparisons: claim.plannedComparisons,
    }))
  }

  findings.push(...evaluatePreregistration(claim))

  const blockers = findings.filter((item) => item.severity === "blocker")
  const warnings = findings.filter((item) => item.severity === "warning")
  const status = blockers.length > 0 ? "hold" : (warnings.length > 0 ? "revise" : "pass")

  const decision = {
    id: claim.id,
    title: claim.title,
    domain: claim.domain,
    status,
    manuscriptClaim: claim.manuscriptClaim,
    powerAssessment: {
      outcomeType: claim.outcomeType,
      sampleSizePerGroup: claim.sampleSizePerGroup,
      requiredPerGroup: requiredN,
      coverageRatio,
      targetPower: claim.targetPower,
      alpha: claim.alpha,
      plannedComparisons: claim.plannedComparisons,
    },
    findings,
    reviewerActions: buildReviewerActions(status, findings),
  }

  return {
    ...decision,
    auditDigest: digestFor(decision),
  }
}

function buildReviewerActions(status, findings) {
  if (status === "pass") {
    return [{ code: "KEEP_POWER_CLAIM", owner: "author", message: "Keep the current power claim with the existing methods disclosure." }]
  }

  const actions = findings.map((item) => {
    if (item.code === "UNDERPOWERED_CLAIM") {
      return { code: "SOFTEN_OR_REPOWER_CLAIM", owner: "author", message: "Revise the claim, increase sample size, or report it as exploratory." }
    }
    if (item.code === "MULTIPLE_TESTING_PLAN_MISSING") {
      return { code: "ADD_MULTIPLICITY_PLAN", owner: "statistics-reviewer", message: "Add correction strategy or clearly label exploratory endpoints." }
    }
    if (item.code === "PREREGISTRATION_MISSING") {
      return { code: "ADD_PREREGISTRATION_LIMITATION", owner: "author", message: "Add preregistration status and limitation text before submission." }
    }
    return { code: `ADDRESS_${item.code}`, owner: "author", message: item.message }
  })

  return [...new Map(actions.map((item) => [item.code, item])).values()]
}

function evaluateStudyPortfolio({ studyClaims, reviewPolicy }) {
  const decisions = studyClaims.map((claim) => evaluateClaim(claim, reviewPolicy))
  const summary = {
    totalClaims: decisions.length,
    passed: decisions.filter((decision) => decision.status === "pass").length,
    revise: decisions.filter((decision) => decision.status === "revise").length,
    held: decisions.filter((decision) => decision.status === "hold").length,
    reviewerActions: decisions.reduce((sum, decision) => sum + decision.reviewerActions.length, 0),
  }

  return {
    generatedAt: "2026-05-21T14:05:00.000Z",
    policy: reviewPolicy,
    summary,
    decisions,
    audit: {
      source: "synthetic-study-power-feasibility-review",
      digest: digestFor({ summary, decisions }),
    },
  }
}

module.exports = {
  evaluateClaim,
  evaluateStudyPortfolio,
  requiredPerGroup,
}
