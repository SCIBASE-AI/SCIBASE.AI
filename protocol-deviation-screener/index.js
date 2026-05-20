const crypto = require("crypto")

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function normalizeList(values) {
  return (values || []).map(normalizeText).filter(Boolean)
}

function includesNormalized(list, value) {
  const needle = normalizeText(value)
  return normalizeList(list).some((item) => item === needle || item.includes(needle) || needle.includes(item))
}

function missingItems(expected, actual) {
  return (expected || []).filter((item) => !includesNormalized(actual, item))
}

function unexpectedItems(actual, expected) {
  return (actual || []).filter((item) => !includesNormalized(expected, item))
}

function hasReference(manuscript, citation) {
  const refs = normalizeList(manuscript.references)
  const candidates = [citation.id, citation.doi, citation.title, citation.url].map(normalizeText).filter(Boolean)
  return candidates.some((candidate) =>
    refs.some((reference) => reference === candidate || reference.includes(candidate) || candidate.includes(reference)),
  )
}

function makeFlag(code, severity, message, evidence, reviewerPrompt) {
  return { code, severity, message, evidence, reviewerPrompt }
}

function screenProtocolDeviation(protocol, manuscript) {
  const flags = []
  const primaryMissing = missingItems(protocol.primaryOutcomes, manuscript.reportedPrimaryOutcomes)
  const unregisteredPrimary = unexpectedItems(manuscript.reportedPrimaryOutcomes, protocol.primaryOutcomes)
  const analysisMissing = missingItems(protocol.plannedAnalyses, manuscript.analysisMethods)
  const analysisAdded = unexpectedItems(manuscript.analysisMethods, protocol.plannedAnalyses)
  const protocolCitation = (protocol.citations || [])[0]

  if (primaryMissing.length > 0) {
    flags.push(
      makeFlag(
        "PRIMARY_OUTCOME_SWITCH",
        "high",
        `Registered primary outcome missing from manuscript primary endpoints: ${primaryMissing.join(", ")}.`,
        {
          source: "manuscript.abstract",
          quote: manuscript.evidenceSpans && manuscript.evidenceSpans.endpoint,
        },
        "Ask the authors to explain whether this is an outcome-switch and to restore the registered primary endpoint.",
      ),
    )
  }

  if (unregisteredPrimary.length > 0) {
    flags.push(
      makeFlag(
        "UNREGISTERED_PRIMARY_OUTCOME",
        "high",
        `Manuscript promotes unregistered primary endpoint(s): ${unregisteredPrimary.join(", ")}.`,
        {
          source: "manuscript.abstract",
          quote: manuscript.evidenceSpans && manuscript.evidenceSpans.endpoint,
        },
        "Require a protocol amendment or downgrade the endpoint to exploratory.",
      ),
    )
  }

  if (analysisMissing.length > 0 || analysisAdded.length > 0) {
    flags.push(
      makeFlag(
        "ANALYSIS_PLAN_DRIFT",
        "medium",
        `Planned analysis mismatch. Missing: ${analysisMissing.join(", ") || "none"}; added: ${
          analysisAdded.join(", ") || "none"
        }.`,
        {
          source: "manuscript.methods",
          quote: manuscript.evidenceSpans && manuscript.evidenceSpans.analysis,
        },
        "Ask for a transparent deviation note and sensitivity analysis using the registered plan.",
      ),
    )
  }

  if (Number.isFinite(protocol.plannedSampleSize) && Number.isFinite(manuscript.sampleSize)) {
    const minimumExpected = Math.ceil(protocol.plannedSampleSize * 0.9)
    if (manuscript.sampleSize < minimumExpected) {
      flags.push(
        makeFlag(
          "SAMPLE_SIZE_SHORTFALL",
          "medium",
          `Observed sample size ${manuscript.sampleSize} is below the 90% protocol threshold of ${minimumExpected}.`,
          {
            source: "manuscript.methods",
            quote: `sampleSize=${manuscript.sampleSize}`,
          },
          "Request recruitment, attrition, and power-impact details.",
        ),
      )
    }
  }

  const methods = normalizeText(manuscript.methods)
  const mentionsLateExclusion = methods.includes("excluded participants after randomization")
  if (mentionsLateExclusion) {
    flags.push(
      makeFlag(
        "UNPLANNED_EXCLUSION",
        "medium",
        "Methods describe post-randomization exclusions that are not present in the registered exclusion rules.",
        {
          source: "manuscript.methods",
          quote: manuscript.evidenceSpans && manuscript.evidenceSpans.exclusions,
        },
        "Ask whether the exclusion was pre-specified and require an intention-to-treat sensitivity check.",
      ),
    )
  }

  if (protocolCitation && !hasReference(manuscript, protocolCitation)) {
    flags.push(
      makeFlag(
        "MISSING_PROTOCOL_CITATION",
        "low",
        "The manuscript does not cite the registered protocol or trial registry record.",
        {
          source: "manuscript.references",
          quote: (manuscript.references || []).join(", "),
        },
        "Add the trial registry/protocol citation before review.",
      ),
    )
  }

  const citationRecommendations = (protocol.citations || [])
    .filter((citation) => !hasReference(manuscript, citation))
    .map((citation) => ({
      citation,
      reason: "Cite the registered protocol so reviewers can compare planned and reported outcomes.",
      apa: formatCitation(citation, "apa"),
      nature: formatCitation(citation, "nature"),
    }))

  const reviewerTasks = flags.map((flag) => {
    if (flag.code === "PRIMARY_OUTCOME_SWITCH") return "Investigate possible outcome-switch against the registry."
    if (flag.code === "UNREGISTERED_PRIMARY_OUTCOME") return "Require a protocol amendment for the new primary endpoint."
    if (flag.code === "ANALYSIS_PLAN_DRIFT") return "Request a registered-plan sensitivity analysis."
    if (flag.code === "SAMPLE_SIZE_SHORTFALL") return "Check attrition and power impact."
    if (flag.code === "UNPLANNED_EXCLUSION") return "Audit post-randomization exclusions."
    return "Add missing protocol citation."
  })

  return {
    protocolId: protocol.id,
    manuscriptTitle: manuscript.title,
    readyForReview: !flags.some((flag) => flag.severity === "high") && flags.length === 0,
    riskScore: flags.reduce((score, flag) => score + (flag.severity === "high" ? 40 : flag.severity === "medium" ? 20 : 5), 0),
    flags,
    citationRecommendations,
    reviewerTasks,
  }
}

function buildSummaryModes(audit) {
  const flagCount = audit.flags.length
  const highFlags = audit.flags.filter((flag) => flag.severity === "high").length
  const topFlag = audit.flags[0]
  const evidenceSpans = audit.flags
    .map((flag) => flag.evidence)
    .filter((evidence) => evidence && evidence.quote)

  return {
    abstractStyle:
      flagCount === 0
        ? `No protocol deviation flags were detected for ${audit.manuscriptTitle}.`
        : `Primary outcome drift and related protocol deviations were detected for ${audit.manuscriptTitle}.`,
    executiveSummary:
      flagCount === 0
        ? "The manuscript appears aligned with the registered protocol and can proceed to reviewer triage."
        : `${flagCount} protocol risk flags were found, including ${highFlags} high-severity issue(s). First review action: ${topFlag.reviewerPrompt}`,
    laypersonExplanation:
      flagCount === 0
        ? "The study appears to report what it originally said it would measure."
        : "The manuscript may have changed from the original study plan, so a reviewer should check whether the change is justified.",
    evidenceSpans,
  }
}

function formatCitation(citation, style = "apa") {
  const authors = citation.authors || []
  if (style === "nature") {
    const compactAuthors = authors
      .map((author) => {
        const parts = author.split(/\s+/)
        return `${parts[parts.length - 1]} ${parts[0][0]}.`
      })
      .join("; ")
    return `${compactAuthors} ${citation.title} (${citation.year}). doi:${citation.doi}`
  }
  if (style === "mla") {
    return `${authors.join(", ")}. "${citation.title}." ${citation.year}, doi:${citation.doi}.`
  }
  return `${authors.join(", ")} (${citation.year}). ${citation.title}. ${citation.url || `https://doi.org/${citation.doi}`}`
}

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

function createAuditDigest(audit) {
  return crypto.createHash("sha256").update(stableStringify(audit)).digest("hex").slice(0, 16)
}

module.exports = {
  screenProtocolDeviation,
  buildSummaryModes,
  formatCitation,
  createAuditDigest,
}
