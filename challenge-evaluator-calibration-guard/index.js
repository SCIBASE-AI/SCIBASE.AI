const crypto = require("node:crypto")

const DEFAULT_POLICY = Object.freeze({
  minRubricCriteria: 2,
  minSeedsPerCriterion: 2,
  requiredSeedOutcomes: ["passing", "borderline", "failing"],
  excludedEvaluatorRoles: ["sponsor", "solver", "observer"],
  minEligibleEvaluators: 2,
  maxEvaluatorMeanDrift: 0.75,
  maxCriterionMeanDrift: 0.85,
  maxInterRaterSpread: 1.5,
  requiredAnchorTypes: ["low", "target", "high"],
  policyVersion: "challenge-evaluator-calibration-v1",
})

function evaluateChallengeEvaluatorCalibration(input = {}) {
  const policy = { ...DEFAULT_POLICY, ...(input.policy || {}) }
  const asOf = input.asOf || new Date().toISOString()
  const challenges = Array.isArray(input.challenges) ? input.challenges : []
  const challengeDecisions = challenges.map((challenge) => evaluateChallenge(challenge, policy))
  const reviewQueue = challengeDecisions.flatMap((challenge) => challenge.reviewQueue)
  const summary = summarize(challengeDecisions, reviewQueue)
  const auditPayload = {
    asOf,
    policy,
    summary,
    challenges: challengeDecisions.map((challenge) => ({
      challengeId: challenge.challengeId,
      status: challenge.status,
      findingCodes: challenge.findings.map((finding) => finding.code),
    })),
  }

  return {
    asOf,
    policy,
    summary,
    challenges: challengeDecisions,
    reviewQueue,
    readyQueue: challengeDecisions
      .filter((challenge) => challenge.status === "live_scoring_ready")
      .map((challenge) => ({
        challengeId: challenge.challengeId,
        action: "open_live_scoring",
        eligibleEvaluators: challenge.summary.eligibleEvaluators,
      })),
    recalibrationQueue: challengeDecisions
      .filter((challenge) => challenge.status !== "live_scoring_ready")
      .map((challenge) => ({
        challengeId: challenge.challengeId,
        action: challenge.status === "hold_live_scoring" ? "hold_and_repair_calibration" : "recalibrate_before_live_scoring",
        findingCodes: challenge.findings.map((finding) => finding.code),
      })),
    audit: {
      algorithm: "sha256",
      digest: digest(auditPayload),
      policyVersion: policy.policyVersion,
    },
  }
}

function evaluateChallenge(challenge, policy) {
  const criteria = Array.isArray(challenge.rubricCriteria) ? challenge.rubricCriteria : []
  const seeds = Array.isArray(challenge.seedSubmissions) ? challenge.seedSubmissions : []
  const evaluators = Array.isArray(challenge.evaluators) ? challenge.evaluators : []
  const scores = Array.isArray(challenge.calibrationScores) ? challenge.calibrationScores : []
  const findings = []
  const checks = []
  const evaluatorsById = new Map(evaluators.map((evaluator) => [evaluator.evaluatorId, evaluator]))
  const seedsById = new Map(seeds.map((seed) => [seed.seedId, seed]))
  const eligibleEvaluators = evaluators.filter((evaluator) => isEligibleEvaluator(evaluator, policy))
  const invalidRoleScores = scores.filter((score) => {
    const evaluator = evaluatorsById.get(score.evaluatorId)
    return !evaluator || !isEligibleEvaluator(evaluator, policy)
  })
  const conflictingScores = scores.filter((score) => hasScoreConflict(score, evaluatorsById, seedsById))
  const coverage = evaluateSeedCoverage(criteria, seeds, policy)
  const evaluatorStats = evaluateEvaluatorDrift(criteria, seedsById, scores, evaluatorsById, policy)
  const criterionStats = evaluateCriterionDrift(criteria, seedsById, scores, evaluatorsById, policy)
  const spreadStats = evaluateInterRaterSpread(scores, seedsById, evaluatorsById, policy)
  const normalization = evaluateNormalizationReadiness(criteria, challenge.normalizationAnchors, policy)

  addCheck(checks, findings, {
    challengeId: challenge.challengeId,
    code: "rubric_declared",
    severity: "critical",
    pass: criteria.length >= policy.minRubricCriteria,
    message: criteria.length >= policy.minRubricCriteria
      ? `${criteria.length} rubric criteria are declared for calibration.`
      : "Rubric is too small or missing for evaluator calibration.",
    remediation: "Declare enough rubric criteria before collecting calibration scores.",
    evidence: { criteria: criteria.map((criterion) => criterion.criterionId) },
  })

  addCheck(checks, findings, {
    challengeId: challenge.challengeId,
    code: "seed_coverage_complete",
    severity: "critical",
    pass: coverage.missingCriterionCoverage.length === 0 && coverage.missingOutcomes.length === 0,
    message: coverage.missingCriterionCoverage.length === 0 && coverage.missingOutcomes.length === 0
      ? "Seed submissions cover every criterion and required outcome bucket."
      : "Seed submissions do not cover every criterion and required outcome bucket.",
    remediation: "Add synthetic seed submissions for each criterion and include passing, borderline, and failing examples.",
    evidence: coverage,
  })

  addCheck(checks, findings, {
    challengeId: challenge.challengeId,
    code: "evaluator_role_exclusion",
    severity: "critical",
    pass: eligibleEvaluators.length >= policy.minEligibleEvaluators && invalidRoleScores.length === 0,
    message: eligibleEvaluators.length >= policy.minEligibleEvaluators && invalidRoleScores.length === 0
      ? "Calibration scores only come from eligible evaluators."
      : "Calibration includes excluded or insufficient evaluator roles.",
    remediation: "Remove sponsor, solver, observer, or unknown-role scores and add enough independent evaluators.",
    evidence: {
      eligibleEvaluatorIds: eligibleEvaluators.map((evaluator) => evaluator.evaluatorId),
      invalidScoreIds: invalidRoleScores.map((score) => score.scoreId),
    },
  })

  addCheck(checks, findings, {
    challengeId: challenge.challengeId,
    code: "conflict_free_scores",
    severity: "critical",
    pass: conflictingScores.length === 0,
    message: conflictingScores.length === 0
      ? "No calibration score is tied to an evaluator/seed conflict."
      : `${conflictingScores.length} calibration scores are affected by evaluator conflicts.`,
    remediation: "Exclude conflicted evaluator scores and recollect calibration scores from independent reviewers.",
    evidence: { conflictingScoreIds: conflictingScores.map((score) => score.scoreId) },
  })

  addCheck(checks, findings, {
    challengeId: challenge.challengeId,
    code: "evaluator_severity_drift_within_limit",
    severity: "warning",
    pass: evaluatorStats.outliers.length === 0,
    message: evaluatorStats.outliers.length === 0
      ? "Evaluator severity drift stays within policy tolerance."
      : `${evaluatorStats.outliers.length} evaluators show severity drift beyond tolerance.`,
    remediation: "Run a calibration discussion, retrain the affected evaluators, or apply an approved normalization plan.",
    evidence: evaluatorStats,
  })

  addCheck(checks, findings, {
    challengeId: challenge.challengeId,
    code: "criterion_drift_within_limit",
    severity: "warning",
    pass: criterionStats.outliers.length === 0,
    message: criterionStats.outliers.length === 0
      ? "Criterion-level drift is within tolerance."
      : `${criterionStats.outliers.length} criteria have calibration drift beyond tolerance.`,
    remediation: "Clarify rubric anchors and rescore affected seed submissions before live scoring.",
    evidence: criterionStats,
  })

  addCheck(checks, findings, {
    challengeId: challenge.challengeId,
    code: "inter_rater_spread_within_limit",
    severity: "warning",
    pass: spreadStats.outliers.length === 0,
    message: spreadStats.outliers.length === 0
      ? "Inter-rater spread stays within tolerance on seed submissions."
      : `${spreadStats.outliers.length} seed/criterion pairs have excessive inter-rater spread.`,
    remediation: "Hold a reviewer calibration session and rescore high-spread seed submissions.",
    evidence: spreadStats,
  })

  addCheck(checks, findings, {
    challengeId: challenge.challengeId,
    code: "score_normalization_ready",
    severity: "critical",
    pass: normalization.missingCriteria.length === 0 && normalization.incompleteAnchors.length === 0,
    message: normalization.missingCriteria.length === 0 && normalization.incompleteAnchors.length === 0
      ? "Score normalization anchors are ready for live scoring."
      : "Score normalization anchors are missing or incomplete.",
    remediation: "Define low, target, and high anchors for each rubric criterion before opening live scoring.",
    evidence: normalization,
  })

  const criticalFindings = findings.filter((finding) => finding.severity === "critical")
  const warningFindings = findings.filter((finding) => finding.severity === "warning")
  const status = criticalFindings.length > 0
    ? "hold_live_scoring"
    : warningFindings.length > 0
      ? "recalibrate_before_live_scoring"
      : "live_scoring_ready"

  return {
    challengeId: challenge.challengeId,
    title: challenge.title,
    status,
    summary: {
      criteria: criteria.length,
      seeds: seeds.length,
      calibrationScores: scores.length,
      eligibleEvaluators: eligibleEvaluators.length,
      criticalFindings: criticalFindings.length,
      warningFindings: warningFindings.length,
    },
    checks,
    findings,
    calibration: {
      coverage,
      evaluatorStats,
      criterionStats,
      spreadStats,
      normalization,
    },
    reviewQueue: findings.map((finding) => ({
      challengeId: challenge.challengeId,
      code: finding.code,
      severity: finding.severity,
      action: findingAction(finding.code),
      remediation: finding.remediation,
    })),
  }
}

function evaluateSeedCoverage(criteria, seeds, policy) {
  const criterionCounts = criteria.map((criterion) => {
    const count = seeds.filter((seed) => Number.isFinite(expectedScore(seed, criterion.criterionId))).length
    return {
      criterionId: criterion.criterionId,
      seedCount: count,
    }
  })
  const outcomeSet = new Set(seeds.map((seed) => seed.outcome).filter(Boolean))

  return {
    criterionCounts,
    missingCriterionCoverage: criterionCounts
      .filter((item) => item.seedCount < policy.minSeedsPerCriterion)
      .map((item) => item.criterionId),
    observedOutcomes: Array.from(outcomeSet).sort(),
    missingOutcomes: policy.requiredSeedOutcomes.filter((outcome) => !outcomeSet.has(outcome)),
  }
}

function evaluateEvaluatorDrift(criteria, seedsById, scores, evaluatorsById, policy) {
  const rowsByEvaluator = new Map()

  for (const score of scores) {
    const evaluator = evaluatorsById.get(score.evaluatorId)
    const seed = seedsById.get(score.seedId)
    if (!seed || !evaluator || !isEligibleEvaluator(evaluator, policy) || hasScoreConflict(score, evaluatorsById, seedsById)) {
      continue
    }

    for (const criterion of criteria) {
      const actual = scoredValue(score, criterion.criterionId)
      const expected = expectedScore(seed, criterion.criterionId)
      if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
        continue
      }

      if (!rowsByEvaluator.has(score.evaluatorId)) {
        rowsByEvaluator.set(score.evaluatorId, [])
      }
      rowsByEvaluator.get(score.evaluatorId).push(actual - expected)
    }
  }

  const evaluators = Array.from(rowsByEvaluator.entries()).map(([evaluatorId, deltas]) => {
    const meanSignedDrift = average(deltas)
    const meanAbsoluteDrift = average(deltas.map((delta) => Math.abs(delta)))
    return {
      evaluatorId,
      samples: deltas.length,
      meanSignedDrift: round(meanSignedDrift),
      meanAbsoluteDrift: round(meanAbsoluteDrift),
    }
  })
  const outliers = evaluators
    .filter((evaluator) => Math.abs(evaluator.meanSignedDrift) > policy.maxEvaluatorMeanDrift)
    .map((evaluator) => evaluator.evaluatorId)

  return { evaluators, outliers, threshold: policy.maxEvaluatorMeanDrift }
}

function evaluateCriterionDrift(criteria, seedsById, scores, evaluatorsById, policy) {
  const criteriaStats = criteria.map((criterion) => {
    const deltas = []
    for (const score of scores) {
      const evaluator = evaluatorsById.get(score.evaluatorId)
      const seed = seedsById.get(score.seedId)
      if (!seed || !evaluator || !isEligibleEvaluator(evaluator, policy) || hasScoreConflict(score, evaluatorsById, seedsById)) {
        continue
      }

      const actual = scoredValue(score, criterion.criterionId)
      const expected = expectedScore(seed, criterion.criterionId)
      if (Number.isFinite(actual) && Number.isFinite(expected)) {
        deltas.push(Math.abs(actual - expected))
      }
    }

    return {
      criterionId: criterion.criterionId,
      samples: deltas.length,
      meanAbsoluteDrift: deltas.length === 0 ? null : round(average(deltas)),
    }
  })
  const outliers = criteriaStats
    .filter((criterion) => Number.isFinite(criterion.meanAbsoluteDrift) && criterion.meanAbsoluteDrift > policy.maxCriterionMeanDrift)
    .map((criterion) => criterion.criterionId)

  return { criteria: criteriaStats, outliers, threshold: policy.maxCriterionMeanDrift }
}

function evaluateInterRaterSpread(scores, seedsById, evaluatorsById, policy) {
  const groupedScores = new Map()

  for (const score of scores) {
    const evaluator = evaluatorsById.get(score.evaluatorId)
    const seed = seedsById.get(score.seedId)
    if (!seed || !evaluator || !isEligibleEvaluator(evaluator, policy) || hasScoreConflict(score, evaluatorsById, seedsById)) {
      continue
    }

    for (const [criterionId, value] of Object.entries(score.scores || {})) {
      if (!Number.isFinite(value)) {
        continue
      }

      const key = `${score.seedId}:${criterionId}`
      if (!groupedScores.has(key)) {
        groupedScores.set(key, [])
      }
      groupedScores.get(key).push(value)
    }
  }

  const pairs = Array.from(groupedScores.entries()).map(([key, values]) => {
    const [seedId, criterionId] = key.split(":")
    const spread = values.length < 2 ? 0 : Math.max(...values) - Math.min(...values)
    return {
      seedId,
      criterionId,
      evaluatorCount: values.length,
      spread: round(spread),
    }
  })
  const outliers = pairs
    .filter((pair) => pair.spread > policy.maxInterRaterSpread)
    .map((pair) => `${pair.seedId}:${pair.criterionId}`)

  return { pairs, outliers, threshold: policy.maxInterRaterSpread }
}

function evaluateNormalizationReadiness(criteria, normalizationAnchors, policy) {
  const anchors = Array.isArray(normalizationAnchors) ? normalizationAnchors : []
  const anchorsByCriterion = new Map(anchors.map((anchor) => [anchor.criterionId, anchor]))
  const missingCriteria = []
  const incompleteAnchors = []

  for (const criterion of criteria) {
    const anchor = anchorsByCriterion.get(criterion.criterionId)
    if (!anchor) {
      missingCriteria.push(criterion.criterionId)
      continue
    }

    const missingTypes = policy.requiredAnchorTypes.filter((type) => !Number.isFinite(anchor[type]))
    if (missingTypes.length > 0) {
      incompleteAnchors.push({
        criterionId: criterion.criterionId,
        missingTypes,
      })
    }
  }

  return { missingCriteria, incompleteAnchors, requiredAnchorTypes: policy.requiredAnchorTypes }
}

function expectedScore(seed, criterionId) {
  return Number.isFinite(seed.expectedScores && seed.expectedScores[criterionId])
    ? seed.expectedScores[criterionId]
    : null
}

function scoredValue(score, criterionId) {
  return Number.isFinite(score.scores && score.scores[criterionId])
    ? score.scores[criterionId]
    : null
}

function isEligibleEvaluator(evaluator, policy) {
  if (!evaluator || evaluator.active === false) {
    return false
  }

  return !policy.excludedEvaluatorRoles.includes(evaluator.role)
}

function hasScoreConflict(score, evaluatorsById, seedsById) {
  const evaluator = evaluatorsById.get(score.evaluatorId)
  const seed = seedsById.get(score.seedId)
  if (!evaluator || !seed) {
    return false
  }

  const conflicts = Array.isArray(evaluator.conflicts) ? evaluator.conflicts : []
  const teamConflict = evaluator.teamId && seed.solverTeamId && evaluator.teamId === seed.solverTeamId
  return teamConflict || conflicts.includes(seed.seedId) || conflicts.includes(seed.solverTeamId)
}

function addCheck(checks, findings, check) {
  checks.push({
    code: check.code,
    severity: check.severity,
    pass: check.pass,
    message: check.message,
    evidence: check.evidence || {},
  })

  if (!check.pass) {
    findings.push({
      challengeId: check.challengeId,
      code: check.code,
      severity: check.severity,
      message: check.message,
      remediation: check.remediation,
      evidence: check.evidence || {},
    })
  }
}

function summarize(challengeDecisions, reviewQueue) {
  return {
    totalChallenges: challengeDecisions.length,
    readyChallenges: challengeDecisions.filter((challenge) => challenge.status === "live_scoring_ready").length,
    recalibrationChallenges: challengeDecisions.filter((challenge) => challenge.status === "recalibrate_before_live_scoring").length,
    heldChallenges: challengeDecisions.filter((challenge) => challenge.status === "hold_live_scoring").length,
    totalSeeds: challengeDecisions.reduce((total, challenge) => total + challenge.summary.seeds, 0),
    totalCalibrationScores: challengeDecisions.reduce((total, challenge) => total + challenge.summary.calibrationScores, 0),
    totalFindings: reviewQueue.length,
    criticalFindings: reviewQueue.filter((item) => item.severity === "critical").length,
    warningFindings: reviewQueue.filter((item) => item.severity === "warning").length,
  }
}

function findingAction(code) {
  const actions = {
    rubric_declared: "declare_calibration_rubric",
    seed_coverage_complete: "add_seed_submission_coverage",
    evaluator_role_exclusion: "exclude_ineligible_evaluator_scores",
    conflict_free_scores: "remove_conflicted_scores",
    evaluator_severity_drift_within_limit: "recalibrate_evaluator_severity",
    criterion_drift_within_limit: "clarify_rubric_anchors",
    inter_rater_spread_within_limit: "rescore_high_spread_seed_pairs",
    score_normalization_ready: "complete_score_normalization_anchors",
  }

  return actions[code] || "calibration_followup"
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length
}

function round(value) {
  return Number(value.toFixed(3))
}

function digest(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
}

module.exports = {
  DEFAULT_POLICY,
  evaluateChallengeEvaluatorCalibration,
}
