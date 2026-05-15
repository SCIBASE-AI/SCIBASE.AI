import crypto from "node:crypto"

const REVIEW_FINDING_WEIGHTS = {
  critical: 30,
  high: 22,
  medium: 12,
  low: 6,
}

const REQUIRED_REPRO_ARTIFACTS = [
  "rawData",
  "cleanPipeline",
  "environmentLock",
  "testSet",
  "reportedResults",
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9.+-]+/g, " ").trim()
}

function hasAny(text, terms) {
  const normalized = normalizeText(text)
  return terms.some((term) => normalized.includes(normalizeText(term)))
}

function intersectionCount(left = [], right = []) {
  const rightSet = new Set(right.map((item) => normalizeText(item)))
  return unique(left.map((item) => normalizeText(item))).filter((item) => rightSet.has(item)).length
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function auditHash(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex")
}

function topicKey(topics = []) {
  return unique(topics.map(normalizeText)).sort().join(" + ")
}

function scoreReproducibility(project, attempts = []) {
  const artifacts = project.artifacts || {}
  const missingArtifacts = REQUIRED_REPRO_ARTIFACTS.filter((name) => !artifacts[name])
  const projectAttempts = attempts.filter((attempt) => attempt.projectId === project.id)
  const failedAttempts = projectAttempts.filter((attempt) => attempt.outcome === "failed")
  const successfulAttempts = projectAttempts.filter((attempt) => attempt.outcome === "passed")
  const nondeterministicAttempts = projectAttempts.filter((attempt) => attempt.outcome === "nondeterministic")

  const dependencyPenalty = project.dependencyIntegrity === "stale" ? 10 : 0
  const outputPenalty = project.outputConsistency === "drifted" ? 16 : 0
  const confidence = clamp(
    100 -
      missingArtifacts.length * 12 -
      failedAttempts.length * 14 -
      nondeterministicAttempts.length * 10 -
      dependencyPenalty -
      outputPenalty +
      successfulAttempts.length * 4,
    0,
    100,
  )

  const remediation = []
  if (missingArtifacts.length) remediation.push(`Add missing artifacts: ${missingArtifacts.join(", ")}`)
  if (failedAttempts.length) remediation.push("Attach failure logs and rerun after environment repair")
  if (nondeterministicAttempts.length) remediation.push("Stabilize random seeds and execution order")
  if (project.dependencyIntegrity === "stale") remediation.push("Refresh dependency lock and runtime metadata")
  if (project.outputConsistency === "drifted") remediation.push("Reconcile reported results against rerun outputs")

  return {
    projectId: project.id,
    title: project.title,
    confidence,
    status: confidence >= 75 ? "ready" : confidence >= 55 ? "review-needed" : "hold",
    missingArtifacts,
    priorAttempts: projectAttempts.map((attempt) => ({
      id: attempt.id,
      outcome: attempt.outcome,
      note: attempt.note,
    })),
    remediation,
  }
}

function reviewManuscript(manuscript) {
  const findings = []
  for (const claim of manuscript.claims || []) {
    if (!claim.evidenceIds?.length) {
      findings.push({
        severity: "high",
        category: "claims-vs-evidence",
        claimId: claim.id,
        message: "Claim has no supporting evidence artifact.",
        action: "Link the claim to raw data, analysis output, or a reproducibility run before release.",
      })
    }
    if (!claim.citationIds?.length) {
      findings.push({
        severity: "medium",
        category: "citation-gap",
        claimId: claim.id,
        message: "Claim lacks a citation trail.",
        action: "Add a citation or mark the claim as a new result with evidence context.",
      })
    }
    if (claim.sampleSize && claim.sampleSize < 30 && claim.pValue && claim.pValue > 0.045 && claim.pValue <= 0.055) {
      findings.push({
        severity: "high",
        category: "statistical-risk",
        claimId: claim.id,
        message: "Small-sample result is close to the significance threshold.",
        action: "Add a power analysis, confidence interval, or replication plan.",
      })
    }
    if (manuscript.domain === "clinical-trials" && !claim.protocolOutcomeId) {
      findings.push({
        severity: "medium",
        category: "domain-template",
        claimId: claim.id,
        message: "Clinical claim is not linked to a registered protocol outcome.",
        action: "Map the claim to a registered primary or secondary endpoint.",
      })
    }
  }

  const riskScore = findings.reduce((total, finding) => total + REVIEW_FINDING_WEIGHTS[finding.severity], 0)
  findings.sort((a, b) => REVIEW_FINDING_WEIGHTS[b.severity] - REVIEW_FINDING_WEIGHTS[a.severity])

  return {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    domain: manuscript.domain,
    recommendation: riskScore >= 40 ? "hold" : riskScore >= 18 ? "revise" : "ready",
    riskScore,
    findings,
  }
}

function rankResearchOpportunities(input) {
  const lab = input.lab || {}
  const interests = lab.interests || []
  const capabilities = [...(lab.capabilities || []), ...(lab.methods || [])]
  const attempts = input.reproducibilityAttempts || []

  return (input.corpusFindings || [])
    .map((finding) => {
      const topics = finding.topics || []
      const methods = finding.methods || []
      const projectAttempts = attempts.filter((attempt) => attempt.topicId === finding.id)
      const failedAttempts = projectAttempts.filter((attempt) => attempt.outcome !== "passed")
      const unresolvedScore = hasAny(finding.limitation || "", [
        "unresolved",
        "negative",
        "null",
        "underpowered",
        "inconsistent",
        "open question",
        "low replication",
      ])
        ? 22
        : 4
      const replicationScore = clamp((5 - (finding.replicationCount || 0)) * 9, 0, 45)
      const activityScore = clamp((finding.citations || 0) / 8 + (finding.activeProjects || 0) * 3, 0, 22)
      const fitScore = clamp(intersectionCount([...topics, ...methods], [...interests, ...capabilities]) * 8, 0, 24)
      const failedAttemptScore = clamp(failedAttempts.length * 8, 0, 24)
      const total = Math.round(unresolvedScore + replicationScore + activityScore + fitScore + failedAttemptScore)

      return {
        id: finding.id,
        topic: topicKey(topics),
        title: finding.title,
        score: total,
        decision: total >= 80 ? "prioritize" : total >= 55 ? "review" : "watch",
        rationale: [
          replicationScore >= 27 ? "low replication count" : null,
          unresolvedScore >= 22 ? "unresolved or negative-result signal" : null,
          activityScore >= 12 ? "active corpus momentum" : null,
          fitScore >= 8 ? "fits lab capabilities" : null,
          failedAttemptScore ? "previous reproducibility friction" : null,
        ].filter(Boolean),
        requiredArtifacts: ["raw data access", "protocol summary", "environment lock", "replication notebook"],
        firstActions: [
          `Confirm scope for ${topicKey(topics)}`,
          "Request raw data and analysis environment",
          "Run minimal replication on a single endpoint",
        ],
      }
    })
    .sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic))
}

function buildReplicationPlans(opportunities, reproducibilityReports) {
  const weakestProjects = reproducibilityReports.filter((report) => report.status !== "ready").slice(0, 3)
  return opportunities.slice(0, 5).map((opportunity, index) => ({
    opportunityId: opportunity.id,
    topic: opportunity.topic,
    priority: index + 1,
    decision: opportunity.decision,
    requiredArtifacts: opportunity.requiredArtifacts,
    firstActions: opportunity.firstActions,
    pairedReproducibilityRisks: weakestProjects.map((project) => ({
      projectId: project.projectId,
      status: project.status,
      topRemediation: project.remediation[0] || "No immediate remediation",
    })),
  }))
}

function createResearchAssistantPlan(input) {
  const peerReviewReports = (input.manuscripts || []).map(reviewManuscript)
  const reproducibilityReports = (input.projects || []).map((project) =>
    scoreReproducibility(project, input.reproducibilityAttempts || []),
  )
  const opportunityFeed = rankResearchOpportunities(input)
  const replicationPlans = buildReplicationPlans(opportunityFeed, reproducibilityReports)
  const status = [
    ...peerReviewReports.map((report) => report.recommendation),
    ...reproducibilityReports.map((report) => report.status),
    ...opportunityFeed.slice(0, 1).map((item) => item.decision),
  ].includes("hold")
    ? "hold"
    : "review-needed"

  const result = {
    status,
    peerReviewReports,
    reproducibilityReports,
    opportunityFeed,
    replicationPlans,
    requirementCoverage: {
      autoPeerReviewReports: peerReviewReports.length > 0,
      claimsVsEvidenceAlignment: peerReviewReports.some((report) =>
        report.findings.some((finding) => finding.category === "claims-vs-evidence"),
      ),
      reproducibilityConfidence: reproducibilityReports.every((report) => Number.isFinite(report.confidence)),
      previousAttemptLinks: reproducibilityReports.some((report) => report.priorAttempts.length > 0),
      researchGapFinder: opportunityFeed.length > 0,
      personalizedOpportunityFeed: replicationPlans.length > 0,
    },
  }

  return {
    ...result,
    auditHash: auditHash(result),
  }
}

export {
  auditHash,
  createResearchAssistantPlan,
  rankResearchOpportunities,
  reviewManuscript,
  scoreReproducibility,
}
