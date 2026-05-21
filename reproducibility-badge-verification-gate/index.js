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

function unique(values) {
  return [...new Set(values)]
}

function countDaysBetween(a, b) {
  const start = new Date(a)
  const end = new Date(b)
  return Math.floor((end.getTime() - start.getTime()) / 86400000)
}

function evaluateArtifactManifest(project, policy) {
  const findings = []
  const artifactIds = new Set(project.artifacts.map((artifact) => artifact.id))

  project.artifacts.forEach((artifact) => {
    if (artifact.required && !hasText(artifact.checksum)) {
      findings.push(finding("ARTIFACT_CHECKSUM_MISSING", "blocker", "Required reproducibility artifact is missing a stable checksum.", {
        artifactId: artifact.id,
      }))
    }
    if (artifact.required && !hasText(artifact.version)) {
      findings.push(finding("ARTIFACT_VERSION_MISSING", "warning", "Required artifact should include a version or release tag.", {
        artifactId: artifact.id,
      }))
    }
  })

  project.reproductionRuns.forEach((run) => {
    run.artifactChecks.forEach((check) => {
      if (!artifactIds.has(check.artifactId)) {
        findings.push(finding("UNKNOWN_ARTIFACT_CHECK", "blocker", "Reproduction run references an artifact outside the badge manifest.", {
          runId: run.id,
          artifactId: check.artifactId,
        }))
      }
    })
  })

  return findings
}

function evaluateEnvironmentManifest(project) {
  const findings = []

  project.environments.forEach((environment) => {
    if (!hasText(environment.digest)) {
      findings.push(finding("ENVIRONMENT_DIGEST_MISSING", "blocker", "Executable environment is missing a reproducible digest.", {
        environmentId: environment.id,
      }))
    }
    if (!hasText(environment.lockfileChecksum)) {
      findings.push(finding("LOCKFILE_CHECKSUM_MISSING", "warning", "Environment lockfile checksum is missing.", {
        environmentId: environment.id,
      }))
    }
  })

  return findings
}

function evaluateRunIndependence(run, project, policy) {
  const findings = []
  const authorIds = new Set(project.authors.map((author) => author.id))
  const authorInstitutions = new Set(project.authors.map((author) => author.institution))

  if (authorIds.has(run.reproducerId) || run.relatedAuthorIds.length > 0) {
    findings.push(finding("REPRODUCER_AUTHOR_CONFLICT", "blocker", "Badge verification run is not independent from project authors.", {
      runId: run.id,
      reproducerId: run.reproducerId,
      relatedAuthorIds: run.relatedAuthorIds,
    }))
  }
  if (run.recentCollaboratorAuthorIds.length > 0) {
    findings.push(finding("RECENT_COLLABORATOR_CONFLICT", "blocker", "Recent collaborator cannot count as an independent badge reproducer.", {
      runId: run.id,
      relatedAuthorIds: run.recentCollaboratorAuthorIds,
    }))
  }
  if (run.fundingRelationship) {
    findings.push(finding("FUNDER_RELATIONSHIP_DISCLOSURE", "warning", "Funding relationship should be disclosed before counting reputation credit.", {
      runId: run.id,
    }))
  }
  if (authorInstitutions.has(run.institution)) {
    findings.push(finding("SAME_INSTITUTION_REVIEW", "warning", "Same-institution reproduction should be disclosed and normally paired with another independent run.", {
      runId: run.id,
      institution: run.institution,
    }))
  }
  if (!policy.allowedReproducerRoles.includes(run.role)) {
    findings.push(finding("REPRODUCER_ROLE_NOT_ALLOWED", "blocker", "Reproducer role is not allowed to verify a badge.", {
      runId: run.id,
      role: run.role,
    }))
  }

  return findings
}

function evaluateRunEvidence(run, project, policy) {
  const findings = []
  const requiredArtifacts = project.artifacts.filter((artifact) => artifact.required)
  const matchedRequired = requiredArtifacts.filter((artifact) => {
    return run.artifactChecks.some((check) => check.artifactId === artifact.id && check.checksumMatches)
  })
  const coverageRatio = requiredArtifacts.length === 0 ? 0 : Number((matchedRequired.length / requiredArtifacts.length).toFixed(3))
  const ageDays = countDaysBetween(run.completedAt, project.badgeRequest.reviewedAt)

  if (coverageRatio < policy.minArtifactCoverage) {
    findings.push(finding("ARTIFACT_COVERAGE_INCOMPLETE", "blocker", "Reproduction run did not verify all required artifacts.", {
      runId: run.id,
      coverageRatio,
    }))
  }
  if (!run.environmentDigestMatches) {
    findings.push(finding("ENVIRONMENT_DIGEST_MISMATCH", "blocker", "Reproduction run used an environment digest that does not match the badge manifest.", {
      runId: run.id,
    }))
  }
  if (!run.outputDigestMatches) {
    findings.push(finding("OUTPUT_DIGEST_MISMATCH", "blocker", "Reproduced outputs do not match the submitted result digest.", {
      runId: run.id,
    }))
  }
  if (!run.testsPassed) {
    findings.push(finding("REPRODUCTION_TESTS_FAILED", "blocker", "Reproduction tests failed for the submitted project.", {
      runId: run.id,
    }))
  }
  if (!hasText(run.runLogChecksum)) {
    findings.push(finding("RUN_LOG_CHECKSUM_MISSING", "warning", "Reproduction run log should include a checksum for auditability.", {
      runId: run.id,
    }))
  }
  if (!run.disclosureSigned) {
    findings.push(finding("REPRODUCER_DISCLOSURE_MISSING", "blocker", "Independent reproducer must sign the conflict and method disclosure.", {
      runId: run.id,
    }))
  }
  if (ageDays > policy.maxRunAgeDays) {
    findings.push(finding("REPRODUCTION_RUN_STALE", "warning", "Reproduction run is older than the badge review freshness window.", {
      runId: run.id,
      ageDays,
    }))
  }

  return findings
}

function runHasBlocker(findings) {
  return findings.some((item) => item.severity === "blocker")
}

function badgeLevelForValidRuns(validRuns, policy) {
  const levels = Object.entries(policy.minIndependentRunsByBadge)
  return levels
    .filter(([, count]) => validRuns >= count)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "none"
}

function buildReviewerActions(status, findings, requestedBadge, recommendedBadge) {
  if (status === "pass") {
    return [{ code: "ISSUE_REPRODUCIBILITY_BADGE", owner: "community-moderator", message: `Issue the requested ${requestedBadge} reproducibility badge.` }]
  }
  if (status === "revise") {
    return [{ code: "ISSUE_LOWER_BADGE_OR_COLLECT_EVIDENCE", owner: "community-moderator", message: `Requested ${requestedBadge} badge is not fully supported; consider ${recommendedBadge} or collect more evidence.` }]
  }

  const actions = findings.map((item) => {
    if (item.code === "REPRODUCER_AUTHOR_CONFLICT" || item.code === "RECENT_COLLABORATOR_CONFLICT") {
      return { code: "REPLACE_CONFLICTED_REPRODUCER", owner: "community-moderator", message: "Request a new independent reproducer before issuing reputation credit." }
    }
    if (item.code === "ARTIFACT_COVERAGE_INCOMPLETE" || item.code === "ARTIFACT_CHECKSUM_MISSING") {
      return { code: "FIX_REPRODUCIBILITY_MANIFEST", owner: "project-author", message: "Complete artifact checksums and coverage before badge review." }
    }
    if (item.code === "ENVIRONMENT_DIGEST_MISMATCH" || item.code === "OUTPUT_DIGEST_MISMATCH" || item.code === "REPRODUCTION_TESTS_FAILED") {
      return { code: "RERUN_REPRODUCTION_EVIDENCE", owner: "independent-reproducer", message: "Re-run reproduction until environment, outputs, and tests match the submitted evidence." }
    }
    if (item.code === "REPRODUCER_DISCLOSURE_MISSING") {
      return { code: "COLLECT_REPRODUCER_DISCLOSURE", owner: "community-moderator", message: "Collect conflict and method disclosure before counting the run." }
    }
    return { code: `ADDRESS_${item.code}`, owner: "community-moderator", message: item.message }
  })

  return [...new Map(actions.map((item) => [item.code, item])).values()]
}

function evaluateProjectBadge(project, policy) {
  const manifestFindings = [
    ...evaluateArtifactManifest(project, policy),
    ...evaluateEnvironmentManifest(project),
  ]

  const runDecisions = project.reproductionRuns.map((run) => {
    const findings = [
      ...evaluateRunIndependence(run, project, policy),
      ...evaluateRunEvidence(run, project, policy),
    ]
    const independent = !runHasBlocker(findings)
    return {
      id: run.id,
      reproducerId: run.reproducerId,
      role: run.role,
      institution: run.institution,
      independent,
      findings,
      auditDigest: digestFor({ run, findings, independent }),
    }
  })

  const validRuns = runDecisions.filter((run) => run.independent)
  const requestedBadge = project.badgeRequest.level
  const requestedRunCount = policy.minIndependentRunsByBadge[requestedBadge] || Number.POSITIVE_INFINITY
  const recommendedBadge = badgeLevelForValidRuns(validRuns.length, policy)
  const badgeFindings = [...manifestFindings, ...runDecisions.flatMap((run) => run.findings)]
  const uniqueInstitutions = unique(validRuns.map((run) => run.institution))

  if (!policy.badgeLevels.includes(requestedBadge)) {
    badgeFindings.push(finding("BADGE_LEVEL_UNKNOWN", "blocker", "Requested badge level is not recognized.", {
      requestedBadge,
    }))
  }
  if (validRuns.length < requestedRunCount) {
    badgeFindings.push(finding("INDEPENDENT_RUNS_BELOW_BADGE_THRESHOLD", "blocker", "Not enough independent successful reproduction runs for the requested badge.", {
      requestedBadge,
      validRuns: validRuns.length,
      requiredRuns: requestedRunCount,
    }))
  }
  if (validRuns.length >= 2 && uniqueInstitutions.length < policy.minInstitutionsForMultiRunBadge) {
    badgeFindings.push(finding("INSTITUTION_DIVERSITY_LOW", "warning", "Multiple reproduction runs should come from more than one institution when possible.", {
      institutions: uniqueInstitutions,
    }))
  }

  const blockers = badgeFindings.filter((item) => item.severity === "blocker")
  const warnings = badgeFindings.filter((item) => item.severity === "warning")
  let status = "pass"
  if (blockers.length > 0 && recommendedBadge !== "none" && policy.allowLowerBadgeRecommendation) {
    status = "revise"
  } else if (blockers.length > 0) {
    status = "hold"
  } else if (warnings.length > 0) {
    status = "revise"
  }

  const decision = {
    id: project.id,
    title: project.title,
    status,
    requestedBadge,
    recommendedBadge,
    evidence: {
      artifacts: project.artifacts.length,
      requiredArtifacts: project.artifacts.filter((artifact) => artifact.required).length,
      environments: project.environments.length,
      reproductionRuns: project.reproductionRuns.length,
      validIndependentRuns: validRuns.length,
      uniqueValidInstitutions: uniqueInstitutions.length,
    },
    findings: badgeFindings,
    runDecisions,
    reviewerActions: buildReviewerActions(status, badgeFindings, requestedBadge, recommendedBadge),
  }

  return {
    ...decision,
    auditDigest: digestFor(decision),
  }
}

function evaluateBadgePortfolio({ projects, policy }) {
  const decisions = projects.map((project) => evaluateProjectBadge(project, policy))
  const summary = {
    totalProjects: decisions.length,
    passed: decisions.filter((decision) => decision.status === "pass").length,
    revise: decisions.filter((decision) => decision.status === "revise").length,
    held: decisions.filter((decision) => decision.status === "hold").length,
    requestedBadges: decisions.reduce((acc, decision) => {
      acc[decision.requestedBadge] = (acc[decision.requestedBadge] || 0) + 1
      return acc
    }, {}),
    validIndependentRuns: decisions.reduce((sum, decision) => sum + decision.evidence.validIndependentRuns, 0),
  }

  return {
    generatedAt: "2026-05-21T18:35:00.000Z",
    policy,
    summary,
    decisions,
    audit: {
      source: "synthetic-reproducibility-badge-verification-gate",
      digest: digestFor({ summary, decisions }),
    },
  }
}

module.exports = {
  digestFor,
  evaluateBadgePortfolio,
  evaluateProjectBadge,
}
