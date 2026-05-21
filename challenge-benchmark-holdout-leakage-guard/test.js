const assert = require("node:assert/strict")
const { evaluateChallengePortfolio } = require("./index")
const { leakagePolicy, challenges } = require("./sample-data")

const packet = evaluateChallengePortfolio({ challenges, leakagePolicy })

assert.equal(packet.summary.totalChallenges, 4)
assert.equal(packet.summary.score, 1)
assert.equal(packet.summary.review, 1)
assert.equal(packet.summary.quarantine, 2)
assert.match(packet.audit.digest, /^[a-f0-9]{64}$/)

const safe = packet.decisions.find((decision) => decision.id === "CH-SAFE-001")
assert.equal(safe.status, "score")
assert.equal(safe.findings.length, 0)
assert.equal(safe.scoringActions[0].code, "RELEASE_TO_SCORING")

const leaked = packet.decisions.find((decision) => decision.id === "CH-LEAK-002")
assert.equal(leaked.status, "quarantine")
assert.ok(leaked.findings.some((finding) => finding.code === "HOLDOUT_RELEASED_TO_PUBLIC_CHANNEL"))
assert.ok(leaked.findings.some((finding) => finding.code === "SOLVER_WORKSPACE_HOLDOUT_GRANT"))
assert.ok(leaked.findings.some((finding) => finding.code === "PUBLIC_BASELINE_HASH_OVERLAP"))
assert.ok(leaked.findings.some((finding) => finding.code === "SUBMISSION_CONTAINS_HOLDOUT_HASH"))
assert.ok(leaked.scoringActions.some((action) => action.code === "FREEZE_LEADERBOARD"))

const review = packet.decisions.find((decision) => decision.id === "CH-REVIEW-003")
assert.equal(review.status, "review")
assert.ok(review.findings.some((finding) => finding.code === "LATE_SPONSOR_EXCEPTION_REVIEW"))

const missingHash = packet.decisions.find((decision) => decision.id === "CH-HOLD-004")
assert.equal(missingHash.status, "quarantine")
assert.ok(missingHash.findings.some((finding) => finding.code === "HOLDOUT_HASH_MISSING"))

console.log("challenge-benchmark-holdout-leakage-guard tests passed")
