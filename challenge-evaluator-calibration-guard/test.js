const assert = require("node:assert/strict")
const { evaluateChallengeEvaluatorCalibration } = require("./index")
const { challenges, policy } = require("./sample-data")

const packet = evaluateChallengeEvaluatorCalibration({
  asOf: "2026-05-23T21:45:00.000Z",
  challenges,
  policy,
})

assert.equal(packet.summary.totalChallenges, 3)
assert.equal(packet.summary.readyChallenges, 1)
assert.equal(packet.summary.recalibrationChallenges, 1)
assert.equal(packet.summary.heldChallenges, 1)
assert.equal(packet.readyQueue.length, 1)
assert.equal(packet.readyQueue[0].challengeId, "neuro-imaging-prize")
assert.equal(packet.recalibrationQueue.length, 2)

const ready = packet.challenges.find((challenge) => challenge.challengeId === "neuro-imaging-prize")
assert.equal(ready.status, "live_scoring_ready")
assert(ready.checks.every((check) => check.pass))
assert.equal(ready.summary.eligibleEvaluators, 3)

const held = packet.challenges.find((challenge) => challenge.challengeId === "materials-catalyst-prize")
assert.equal(held.status, "hold_live_scoring")
assert(held.findings.some((finding) => finding.code === "seed_coverage_complete"))
assert(held.findings.some((finding) => finding.code === "evaluator_role_exclusion"))
assert(held.findings.some((finding) => finding.code === "conflict_free_scores"))
assert(held.findings.some((finding) => finding.code === "score_normalization_ready"))
const coverage = held.findings.find((finding) => finding.code === "seed_coverage_complete")
assert.deepEqual(coverage.evidence.missingOutcomes, ["borderline"])
assert(coverage.evidence.missingCriterionCoverage.includes("reproducibility"))

const recalibrate = packet.challenges.find((challenge) => challenge.challengeId === "climate-forecast-prize")
assert.equal(recalibrate.status, "recalibrate_before_live_scoring")
assert(recalibrate.findings.some((finding) => finding.code === "evaluator_severity_drift_within_limit"))
assert(recalibrate.findings.some((finding) => finding.code === "inter_rater_spread_within_limit"))
assert.equal(
  recalibrate.findings.some((finding) => finding.severity === "critical"),
  false,
)

const cleanSingle = evaluateChallengeEvaluatorCalibration({
  asOf: "2026-05-23T21:45:00.000Z",
  policy,
  challenges: [challenges[0]],
})
assert.equal(cleanSingle.summary.readyChallenges, 1)
assert.equal(cleanSingle.summary.totalFindings, 0)

const repeated = evaluateChallengeEvaluatorCalibration({
  asOf: "2026-05-23T21:45:00.000Z",
  challenges,
  policy,
})
assert.equal(repeated.audit.digest, packet.audit.digest)

console.log("challenge evaluator calibration guard tests passed")
