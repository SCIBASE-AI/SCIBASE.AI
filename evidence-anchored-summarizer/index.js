"use strict"

const crypto = require("node:crypto")

const MODES = new Set(["abstract", "executive", "layperson"])
const REQUIRED_SECTIONS = new Set(["objective", "methods", "results"])

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

function normalizeMode(mode) {
  return MODES.has(mode) ? mode : "abstract"
}

function splitSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function evidenceById(evidence) {
  return new Map((evidence || []).map((item) => [item.id, item]))
}

function claimScore(claim, evidenceMap) {
  const anchors = claim.evidenceIds || []
  const supported = anchors.filter((id) => evidenceMap.has(id))
  const requiredBonus = REQUIRED_SECTIONS.has(claim.section) ? 2 : 0
  const findingBonus = claim.kind === "finding" ? 2 : claim.kind === "method" ? 1 : 0
  return supported.length * 3 + requiredBonus + findingBonus
}

function summarizeClaim(claim, mode) {
  const sentence = splitSentences(claim.text)[0] || claim.text || "No claim text provided."
  if (mode === "layperson") {
    return sentence
      .replace(/\bp\s*[<=>]\s*0\.\d+\b/gi, "a statistical signal")
      .replace(/\bconfidence interval\b/gi, "uncertainty range")
      .replace(/\bregression\b/gi, "trend analysis")
  }
  if (mode === "executive") {
    return `${claim.section || "study"}: ${sentence}`
  }
  return sentence
}

function buildSummary(input) {
  const mode = normalizeMode(input.mode)
  const evidenceMap = evidenceById(input.evidence)
  const claims = [...(input.claims || [])]
    .map((claim) => ({
      ...claim,
      supportedEvidenceIds: (claim.evidenceIds || []).filter((id) => evidenceMap.has(id)),
      missingEvidenceIds: (claim.evidenceIds || []).filter((id) => !evidenceMap.has(id)),
    }))
    .sort((a, b) => claimScore(b, evidenceMap) - claimScore(a, evidenceMap))

  const blockers = []
  const warnings = []
  const sectionsCovered = new Set(claims.map((claim) => claim.section))
  for (const required of REQUIRED_SECTIONS) {
    if (!sectionsCovered.has(required)) warnings.push(`missing ${required} claim in summary input`)
  }
  for (const claim of claims) {
    if ((claim.evidenceIds || []).length === 0) {
      blockers.push(`claim ${claim.id} has no evidence anchors`)
    }
    if (claim.missingEvidenceIds.length > 0) {
      blockers.push(`claim ${claim.id} references missing evidence: ${claim.missingEvidenceIds.join(", ")}`)
    }
  }

  const selectedClaims = claims.slice(0, input.maxClaims || 5)
  const bullets = selectedClaims.map((claim) => ({
    claimId: claim.id,
    section: claim.section,
    text: summarizeClaim(claim, mode),
    evidenceIds: claim.supportedEvidenceIds,
  }))

  const implications = selectedClaims
    .filter((claim) => claim.kind === "finding" || claim.kind === "limitation")
    .slice(0, 3)
    .map((claim) => ({
      claimId: claim.id,
      text:
        claim.kind === "limitation"
          ? `Treat ${claim.section || "this result"} cautiously until the limitation is resolved.`
          : `Use ${claim.section || "this finding"} as a candidate next-step signal.`,
    }))

  const status = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "held" : "ready"
  const summary = {
    sourceId: input.sourceId || null,
    title: input.title || "Untitled research source",
    mode,
    status,
    headline:
      mode === "layperson"
        ? "Plain-language summary with evidence links"
        : mode === "executive"
          ? "Decision-ready research summary"
          : "Evidence-anchored abstract summary",
    bullets,
    implications,
    nextSteps: [
      "Review all cited evidence anchors before sharing externally.",
      "Resolve blockers before treating the summary as publication-ready.",
      "Regenerate after manuscript or dataset revisions.",
    ],
    blockers,
    warnings,
  }

  return {
    ...summary,
    evidenceDigest: digest({
      sourceId: summary.sourceId,
      title: summary.title,
      bullets,
      implications,
      blockers,
      warnings,
    }),
  }
}

module.exports = {
  buildSummary,
}
