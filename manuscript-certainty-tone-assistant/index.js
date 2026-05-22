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

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0
}

function includesAny(text, phrases) {
  return phrases.some((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text)
  })
}

function evidenceById(manuscript) {
  return new Map(manuscript.evidence.map((item) => [item.id, item]))
}

function strongestEvidenceRank(claim, manuscript, policy) {
  const byId = evidenceById(manuscript)
  const ranks = claim.evidenceIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((item) => policy.evidenceRank[item.strength] || 0)

  return ranks.length === 0 ? 0 : Math.max(...ranks)
}

function evidenceLabels(claim, manuscript) {
  const byId = evidenceById(manuscript)
  return claim.evidenceIds
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((item) => item.strength)
}

function evaluateClaimCertainty(claim, manuscript, policy) {
  const findings = []
  const evidenceRank = strongestEvidenceRank(claim, manuscript, policy)
  const evidenceKinds = evidenceLabels(claim, manuscript)
  const text = claim.text || ""
  const certaintyHit = includesAny(text, policy.overconfidentTerms)
  const universalHit = includesAny(text, policy.universalTerms)
  const causalHit = claim.intent === "causal" || includesAny(text, policy.causalTerms)
  const significanceHit = includesAny(text, policy.significanceTerms)
  const uncertaintyHit = includesAny(text, policy.uncertaintyTerms)
  const broadScopeHit = includesAny(text, policy.broadScopeTerms)

  if (claim.evidenceIds.length === 0) {
    findings.push(finding("CLAIM_EVIDENCE_MISSING", "blocker", "Claim has no linked evidence span.", {
      claimId: claim.id,
    }))
  }

  if (causalHit && evidenceRank < policy.minEvidenceRankForCausalClaim) {
    findings.push(finding("CAUSAL_LANGUAGE_UNDERPOWERED", "blocker", "Causal language is stronger than the linked study design supports.", {
      claimId: claim.id,
      evidenceKinds,
      requiredRank: policy.minEvidenceRankForCausalClaim,
    }))
  }

  if (certaintyHit && evidenceRank < policy.minEvidenceRankForDefinitiveClaim) {
    findings.push(finding("DEFINITIVE_TONE_UNSUPPORTED", "blocker", "Definitive manuscript wording is not supported by high-strength evidence.", {
      claimId: claim.id,
      evidenceKinds,
    }))
  }

  if (universalHit && (!claim.replicationContexts || claim.replicationContexts.length < policy.minContextsForUniversalClaim)) {
    findings.push(finding("UNIVERSAL_SCOPE_NOT_REPLICATED", "warning", "Universal or population-wide wording needs more replication context.", {
      claimId: claim.id,
      contexts: claim.replicationContexts || [],
    }))
  }

  if (broadScopeHit && claim.sampleSize < policy.minSampleForBroadPopulationClaim) {
    findings.push(finding("BROAD_SCOPE_SAMPLE_TOO_SMALL", "warning", "Broad population wording is not matched by the sample size.", {
      claimId: claim.id,
      sampleSize: claim.sampleSize,
      requiredSample: policy.minSampleForBroadPopulationClaim,
    }))
  }

  if (significanceHit && typeof claim.pValue !== "number") {
    findings.push(finding("SIGNIFICANCE_STATISTIC_MISSING", "blocker", "Significance wording needs a reported p-value or equivalent statistical test.", {
      claimId: claim.id,
    }))
  }

  if (typeof claim.pValue === "number" && claim.pValue >= policy.alpha) {
    findings.push(finding("SIGNIFICANCE_LANGUAGE_CONFLICT", "blocker", "Manuscript says the result is significant but the p-value is not below the policy alpha.", {
      claimId: claim.id,
      pValue: claim.pValue,
      alpha: policy.alpha,
    }))
  }

  if (significanceHit && !claim.confidenceInterval) {
    findings.push(finding("UNCERTAINTY_INTERVAL_MISSING", "warning", "Significance wording should include a confidence or credible interval for calibration.", {
      claimId: claim.id,
    }))
  }

  if (evidenceRank <= policy.lowEvidenceRank && !uncertaintyHit) {
    findings.push(finding("UNCERTAINTY_LANGUAGE_MISSING", "warning", "Lower-strength evidence should use calibrated uncertainty language.", {
      claimId: claim.id,
      evidenceKinds,
    }))
  }

  if (!claim.limitationsLinked && (certaintyHit || causalHit || broadScopeHit)) {
    findings.push(finding("LIMITATION_LINK_MISSING", "warning", "Strongly worded claim should link to a limitation or boundary note.", {
      claimId: claim.id,
    }))
  }

  return findings
}

function suggestedTone(claim, findings) {
  const codes = new Set(findings.map((item) => item.code))

  if (codes.has("CAUSAL_LANGUAGE_UNDERPOWERED")) {
    return claim.text
      .replace(/\bproves?\b/gi, "is associated with")
      .replace(/\bcauses?\b/gi, "is associated with")
      .replace(/\beliminates?\b/gi, "may reduce")
  }
  if (codes.has("DEFINITIVE_TONE_UNSUPPORTED")) {
    return claim.text
      .replace(/\bdefinitively\b/gi, "with current evidence")
      .replace(/\balways\b/gi, "in the tested settings")
      .replace(/\bguarantees?\b/gi, "may support")
  }
  if (codes.has("BROAD_SCOPE_SAMPLE_TOO_SMALL") || codes.has("UNIVERSAL_SCOPE_NOT_REPLICATED")) {
    return `${claim.text} Boundary: this statement should be limited to the studied cohort and replication settings.`
  }
  if (codes.has("UNCERTAINTY_LANGUAGE_MISSING")) {
    return `Current evidence suggests that ${claim.text.charAt(0).toLowerCase()}${claim.text.slice(1)}`
  }
  return claim.text
}

function buildReviewerActions(claimDecisions) {
  const actions = []
  const allFindings = claimDecisions.flatMap((decision) => decision.findings)
  const codes = new Set(allFindings.map((item) => item.code))

  if (codes.has("CLAIM_EVIDENCE_MISSING")) {
    actions.push({ code: "ADD_EVIDENCE_ANCHORS", owner: "author", message: "Link every strong manuscript claim to source evidence spans before AI review signoff." })
  }
  if (codes.has("CAUSAL_LANGUAGE_UNDERPOWERED") || codes.has("DEFINITIVE_TONE_UNSUPPORTED")) {
    actions.push({ code: "CALIBRATE_STRONG_CLAIMS", owner: "author", message: "Rewrite causal or definitive statements to match the study design and evidence strength." })
  }
  if (codes.has("SIGNIFICANCE_STATISTIC_MISSING") || codes.has("SIGNIFICANCE_LANGUAGE_CONFLICT") || codes.has("UNCERTAINTY_INTERVAL_MISSING")) {
    actions.push({ code: "REPAIR_STATISTICAL_TONE", owner: "statistics-reviewer", message: "Align significance language with reported tests, alpha threshold, and uncertainty intervals." })
  }
  if (codes.has("BROAD_SCOPE_SAMPLE_TOO_SMALL") || codes.has("UNIVERSAL_SCOPE_NOT_REPLICATED")) {
    actions.push({ code: "NARROW_POPULATION_SCOPE", owner: "domain-reviewer", message: "Limit population-wide language to the studied cohort or add replication evidence." })
  }
  if (codes.has("LIMITATION_LINK_MISSING") || codes.has("UNCERTAINTY_LANGUAGE_MISSING")) {
    actions.push({ code: "ADD_LIMITATIONS_AND_HEDGING", owner: "author", message: "Add limitation anchors and calibrated uncertainty language for lower-strength evidence." })
  }

  return actions
}

function evaluateManuscript(manuscript, policy) {
  const claimDecisions = manuscript.claims.map((claim) => {
    const findings = evaluateClaimCertainty(claim, manuscript, policy)
    const blockerCount = findings.filter((item) => item.severity === "blocker").length
    const warningCount = findings.filter((item) => item.severity === "warning").length

    return {
      id: claim.id,
      section: claim.section,
      intent: claim.intent,
      text: claim.text,
      status: blockerCount > 0 ? "hold" : warningCount > 0 ? "revise" : "pass",
      suggestedTone: suggestedTone(claim, findings),
      evidenceStrengths: evidenceLabels(claim, manuscript),
      findings,
      auditDigest: digestFor({ claim, findings }),
    }
  })

  const allFindings = claimDecisions.flatMap((decision) => decision.findings)
  const blockerCount = allFindings.filter((item) => item.severity === "blocker").length
  const warningCount = allFindings.filter((item) => item.severity === "warning").length
  const status = blockerCount > 0 ? "hold" : warningCount > 0 ? "revise" : "pass"
  const reviewerActions = buildReviewerActions(claimDecisions)

  return {
    id: manuscript.id,
    title: manuscript.title,
    field: manuscript.field,
    status,
    summary: {
      claims: claimDecisions.length,
      passedClaims: claimDecisions.filter((decision) => decision.status === "pass").length,
      claimsNeedingRevision: claimDecisions.filter((decision) => decision.status === "revise").length,
      heldClaims: claimDecisions.filter((decision) => decision.status === "hold").length,
      blockers: blockerCount,
      warnings: warningCount,
    },
    claimDecisions,
    reviewerActions,
    auditDigest: digestFor({ manuscript, claimDecisions, reviewerActions }),
  }
}

function evaluatePortfolio({ manuscripts, policy }) {
  const decisions = manuscripts.map((manuscript) => evaluateManuscript(manuscript, policy))
  const summary = {
    totalManuscripts: decisions.length,
    pass: decisions.filter((decision) => decision.status === "pass").length,
    revise: decisions.filter((decision) => decision.status === "revise").length,
    hold: decisions.filter((decision) => decision.status === "hold").length,
    totalClaims: decisions.reduce((sum, decision) => sum + decision.summary.claims, 0),
    totalBlockers: decisions.reduce((sum, decision) => sum + decision.summary.blockers, 0),
    totalWarnings: decisions.reduce((sum, decision) => sum + decision.summary.warnings, 0),
  }

  return {
    generatedAt: new Date("2026-05-22T20:00:00.000Z").toISOString(),
    assistant: "manuscript-certainty-tone-assistant",
    issue: "SCIBASE-AI/SCIBASE.AI#13",
    summary,
    decisions,
    audit: {
      digest: digestFor({ summary, decisions }),
    },
  }
}

module.exports = {
  digestFor,
  evaluateClaimCertainty,
  evaluateManuscript,
  evaluatePortfolio,
}
