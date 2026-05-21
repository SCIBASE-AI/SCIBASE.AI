const crypto = require("node:crypto")

const BLOCKER_WEIGHTS = {
  missing_irb: 35,
  consent_scope_mismatch: 30,
  restricted_data_without_dua: 25,
  biosafety_clearance_gap: 30,
  missing_animal_protocol: 28,
  dual_use_review: 18,
  stale_or_retracted_evidence: 40,
}

function normalizeList(value) {
  if (!value) return []
  return Array.isArray(value) ? value.filter(Boolean) : [value]
}

function hasScope(evidence, requestedScope) {
  const scopes = normalizeList(evidence.consentScope)
  return scopes.includes(requestedScope) || scopes.includes("open_reuse")
}

function evaluateEvidence(evidence, userContext) {
  const blockers = []
  const warnings = []

  if (["retracted", "stale", "superseded"].includes(evidence.status)) {
    blockers.push({
      code: "stale_or_retracted_evidence",
      message: `Evidence ${evidence.id} is ${evidence.status}.`,
    })
  }

  if (evidence.subjectType === "human") {
    if (!evidence.irbApproval || !userContext.hasActiveIrbProtocol) {
      blockers.push({
        code: "missing_irb",
        message: `Human-subject evidence ${evidence.id} requires active IRB approval before graph reuse.`,
      })
    }

    if (!hasScope(evidence, evidence.requestedScope || userContext.intendedUse)) {
      blockers.push({
        code: "consent_scope_mismatch",
        message: `Consent scope for ${evidence.id} does not cover ${evidence.requestedScope || userContext.intendedUse}.`,
      })
    }
  }

  if (evidence.dataUse === "restricted" && !userContext.hasDataUseAgreement) {
    blockers.push({
      code: "restricted_data_without_dua",
      message: `Restricted evidence ${evidence.id} requires a data-use agreement before recommendation display.`,
    })
  }

  if ((evidence.biosafetyLevel || 1) > (userContext.biosafetyClearanceLevel || 1)) {
    blockers.push({
      code: "biosafety_clearance_gap",
      message: `Evidence ${evidence.id} requires BSL-${evidence.biosafetyLevel}, user context has BSL-${userContext.biosafetyClearanceLevel || 1}.`,
    })
  }

  if (evidence.subjectType === "animal" && !(evidence.animalProtocol || userContext.hasAnimalCareProtocol)) {
    blockers.push({
      code: "missing_animal_protocol",
      message: `Animal-study evidence ${evidence.id} needs IACUC/animal-care protocol evidence.`,
    })
  }

  if (evidence.dualUseRisk === "review") {
    warnings.push({
      code: "dual_use_review",
      message: `Evidence ${evidence.id} should be reviewed for dual-use context before broad discovery placement.`,
    })
  }

  return { blockers, warnings }
}

function scoreRisk(blockers, warnings) {
  const blockerScore = blockers.reduce((sum, blocker) => sum + (BLOCKER_WEIGHTS[blocker.code] || 15), 0)
  const warningScore = warnings.reduce((sum, warning) => sum + (BLOCKER_WEIGHTS[warning.code] || 8), 0)
  return Math.min(100, blockerScore + warningScore)
}

function buildCuratorActions(recommendation, blockers, warnings) {
  return [...blockers, ...warnings].map((item) => ({
    recommendationId: recommendation.id,
    action: item.code.startsWith("missing") ? "attach_required_ethics_evidence" : "review_recommendation_path",
    code: item.code,
    message: item.message,
  }))
}

function buildJsonLdPacket(recommendation, decision) {
  return {
    "@context": "https://schema.org",
    "@type": "Recommendation",
    identifier: recommendation.id,
    name: recommendation.title,
    description: recommendation.rationale,
    ethicsReview: {
      "@type": "Review",
      reviewBody: decision.blockers.length
        ? "Held until ethics provenance gaps are resolved."
        : "Visible with current ethics provenance.",
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(100 - decision.riskScore),
        bestRating: "100",
        worstRating: "0",
      },
    },
    about: recommendation.nodes.map((node) => ({
      "@type": node.type,
      identifier: node.id,
      name: node.name,
    })),
  }
}

function evaluateRecommendation(recommendation, userContext) {
  const evidenceResults = recommendation.evidence.map((evidence) => evaluateEvidence(evidence, userContext))
  const blockers = evidenceResults.flatMap((result) => result.blockers)
  const warnings = evidenceResults.flatMap((result) => result.warnings)
  const riskScore = scoreRisk(blockers, warnings)
  const status = blockers.length > 0 ? "hold" : "show"

  const decision = {
    recommendationId: recommendation.id,
    title: recommendation.title,
    status,
    riskScore,
    blockers,
    warnings,
    curatorActions: buildCuratorActions(recommendation, blockers, warnings),
  }

  return {
    ...decision,
    jsonLd: buildJsonLdPacket(recommendation, decision),
  }
}

function makeAuditDigest(decisions) {
  const canonical = JSON.stringify(decisions.map((decision) => ({
    id: decision.recommendationId,
    status: decision.status,
    riskScore: decision.riskScore,
    blockers: decision.blockers.map((blocker) => blocker.code).sort(),
    warnings: decision.warnings.map((warning) => warning.code).sort(),
  })))

  return {
    visible: decisions.filter((decision) => decision.status === "show").length,
    held: decisions.filter((decision) => decision.status === "hold").length,
    curatorActions: decisions.reduce((sum, decision) => sum + decision.curatorActions.length, 0),
    digest: crypto.createHash("sha256").update(canonical).digest("hex"),
  }
}

function evaluateEthicsProvenance(input) {
  const decisions = input.recommendations.map((recommendation) =>
    evaluateRecommendation(recommendation, input.userContext),
  )

  return {
    generatedAt: new Date("2026-05-21T00:00:00.000Z").toISOString(),
    userContext: {
      institutionId: input.userContext.institutionId,
      intendedUse: input.userContext.intendedUse,
      biosafetyClearanceLevel: input.userContext.biosafetyClearanceLevel,
    },
    decisions,
    audit: makeAuditDigest(decisions),
  }
}

module.exports = {
  evaluateEthicsProvenance,
  evaluateEvidence,
  buildJsonLdPacket,
  makeAuditDigest,
}
