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

const DOMAIN_RULES = [
  {
    domain: "clinical",
    terms: ["clinical", "trial", "patient", "cohort", "consort", "irb", "endpoint", "randomized"],
    sections: ["patient eligibility", "endpoint validity", "safety reporting", "ethics and consent"],
  },
  {
    domain: "machine-learning",
    terms: ["model", "benchmark", "dataset", "training", "validation", "baseline", "ablation", "auc", "accuracy"],
    sections: ["data split integrity", "baseline comparison", "ablation strength", "leakage risk"],
  },
  {
    domain: "wet-lab-biology",
    terms: ["assay", "cell", "gene", "protein", "western", "qpcr", "crispr", "replicate", "antibody"],
    sections: ["biological replicates", "reagent validation", "protocol controls", "raw measurement evidence"],
  },
  {
    domain: "materials-chemistry",
    terms: ["synthesis", "catalyst", "polymer", "crystal", "spectra", "xrd", "sem", "nmr", "yield"],
    sections: ["synthesis reproducibility", "characterization evidence", "purity controls", "yield accounting"],
  },
  {
    domain: "computational",
    terms: ["simulation", "notebook", "pipeline", "code", "parameter", "runtime", "dependency", "container"],
    sections: ["runtime reproducibility", "parameter coverage", "artifact availability", "determinism checks"],
  },
]

function tokenize(input) {
  return String(input || "")
    .toLowerCase()
    .split(/[^a-z0-9+.-]+/)
    .filter(Boolean)
}

function classifyDomain(manuscript) {
  const tokens = tokenize(
    [
      manuscript.title,
      manuscript.abstract,
      ...(manuscript.keywords || []),
      ...(manuscript.methods || []),
      ...(manuscript.artifacts || []).map((artifact) => `${artifact.type || ""} ${artifact.name || ""}`),
    ].join(" "),
  )
  const tokenSet = new Set(tokens)

  const scores = DOMAIN_RULES.map((rule) => {
    const matchedTerms = rule.terms.filter((term) => tokenSet.has(term))
    return {
      domain: rule.domain,
      score: matchedTerms.length,
      matchedTerms,
      sections: rule.sections,
    }
  }).sort((a, b) => b.score - a.score || a.domain.localeCompare(b.domain))

  const winner = scores[0]
  return winner.score > 0
    ? winner
    : {
        domain: "general-science",
        score: 0,
        matchedTerms: [],
        sections: ["claim clarity", "methods adequacy", "evidence alignment", "reproducibility readiness"],
      }
}

function evaluateEvidence(manuscript) {
  const artifacts = manuscript.artifacts || []
  const evidenceIds = new Set((manuscript.evidence || []).map((item) => item.id))
  const claims = manuscript.claims || []
  const warnings = []
  const blockers = []

  for (const required of ["manuscript", "data", "code"]) {
    if (!artifacts.some((artifact) => artifact.type === required)) {
      warnings.push(`missing ${required} artifact`)
    }
  }

  for (const claim of claims) {
    const claimEvidence = claim.evidenceIds || []
    if (claimEvidence.length === 0) {
      blockers.push(`claim ${claim.id} has no evidence anchors`)
    } else {
      const missing = claimEvidence.filter((id) => !evidenceIds.has(id))
      if (missing.length > 0) blockers.push(`claim ${claim.id} references missing evidence: ${missing.join(", ")}`)
    }
  }

  if (!manuscript.reproducibility?.environment) warnings.push("missing reproducibility environment")
  if (!manuscript.reproducibility?.runCommand) warnings.push("missing reproducibility run command")
  if (!manuscript.reproducibility?.expectedOutputs?.length) warnings.push("missing expected output manifest")

  return { blockers, warnings }
}

function buildReviewQuestions(domainResult, manuscript, evidenceResult) {
  const questions = domainResult.sections.map((section) => ({
    section,
    prompt: `Assess ${section} for ${manuscript.title || "the manuscript"} using cited evidence and reproducibility artifacts.`,
  }))

  questions.push({
    section: "claim-evidence alignment",
    prompt: "List every central claim and confirm whether the cited artifacts directly support it.",
  })
  questions.push({
    section: "reproducibility check",
    prompt: "Verify the data, code, environment, run command, and expected outputs are sufficient for rerun.",
  })

  if (evidenceResult.blockers.length > 0) {
    questions.unshift({
      section: "release blocker",
      prompt: "Resolve unanchored or missing-evidence claims before sending this manuscript to review.",
    })
  }

  return questions
}

function selectDomainReviewTemplate(input) {
  const manuscript = input.manuscript || {}
  const domain = classifyDomain(manuscript)
  const evidence = evaluateEvidence(manuscript)
  const questions = buildReviewQuestions(domain, manuscript, evidence)
  const reviewerPacket = {
    templateId: `${domain.domain}-peer-review`,
    domain: domain.domain,
    matchedTerms: domain.matchedTerms,
    status: evidence.blockers.length > 0 ? "blocked" : evidence.warnings.length > 0 ? "needs-review" : "ready",
    prioritySections: domain.sections,
    blockers: evidence.blockers,
    warnings: evidence.warnings,
    reviewQuestions: questions,
    recommendedReviewerExpertise: [
      domain.domain,
      evidence.warnings.some((warning) =>
        ["reproducibility", "environment", "run command", "expected output"].some((term) => warning.includes(term)),
      )
        ? "reproducibility"
        : null,
      evidence.blockers.length > 0 ? "evidence-audit" : null,
    ].filter(Boolean),
  }

  return {
    ...reviewerPacket,
    auditDigest: digest(reviewerPacket),
  }
}

module.exports = {
  selectDomainReviewTemplate,
}
