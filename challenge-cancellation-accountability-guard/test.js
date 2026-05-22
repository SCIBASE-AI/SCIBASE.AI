import assert from "node:assert/strict"
import { evaluateChallengeCancellations } from "./index.js"
import { cancellationPolicy, challengeCancellations } from "./sample-data.js"

const report = evaluateChallengeCancellations(challengeCancellations, cancellationPolicy)

assert.equal(report.status, "hold_cancellation_close")
assert.equal(report.totals.challenges, 3)
assert.equal(report.totals.heldChallenges, 1)
assert.equal(report.totals.readyChallenges, 2)
assert.equal(report.totals.solverTeams, 5)
assert.equal(report.totals.criticalCount, 4)
assert.equal(report.totals.warningCount, 2)
assert.equal(report.totals.compensationShortfallCents, 180000)
assert.match(report.auditDigest, /^[a-f0-9]{64}$/)

const cancelled = report.challengeSummaries.find(
  (summary) => summary.id === "sci-bio-forecast-2026",
)
assert.equal(cancelled.decision, "hold_cancellation")
assert.ok(cancelled.blockerCodes.includes("solver_notification_gap"))
assert.ok(cancelled.blockerCodes.includes("refund_requested_before_appeal_window"))
assert.ok(cancelled.blockerCodes.includes("solver_ip_not_retained"))
assert.ok(cancelled.warningCodes.includes("partial_work_compensation_shortfall"))

const noAward = report.challengeSummaries.find((summary) => summary.id === "quantum-noise-round")
assert.equal(noAward.decision, "ready_for_close")
assert.equal(noAward.reviewedCount, noAward.solverCount)
assert.equal(noAward.compensationShortfallCents, 0)

const materials = report.challengeSummaries.find((summary) => summary.id === "materials-screening")
assert.equal(materials.decision, "ready_for_close")
assert.equal(materials.appealWindowDays, 11)

console.log("challenge cancellation accountability guard tests passed")
