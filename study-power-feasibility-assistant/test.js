const assert = require("node:assert/strict")
const { evaluateStudyPortfolio, requiredPerGroup } = require("./index")
const { reviewPolicy, studyClaims } = require("./sample-data")

const packet = evaluateStudyPortfolio({ studyClaims, reviewPolicy })

assert.equal(packet.summary.totalClaims, 4)
assert.equal(packet.summary.passed, 1)
assert.equal(packet.summary.revise, 2)
assert.equal(packet.summary.held, 1)
assert.match(packet.audit.digest, /^[a-f0-9]{64}$/)

const supported = packet.decisions.find((decision) => decision.id === "SP-OK-001")
assert.equal(supported.status, "pass")
assert.equal(supported.findings.length, 0)
assert.ok(supported.powerAssessment.coverageRatio >= 1)
assert.equal(supported.reviewerActions[0].code, "KEEP_POWER_CLAIM")

const underpowered = packet.decisions.find((decision) => decision.id === "SP-REV-002")
assert.equal(underpowered.status, "revise")
assert.ok(underpowered.findings.some((finding) => finding.code === "UNDERPOWERED_CLAIM"))
assert.ok(underpowered.findings.some((finding) => finding.code === "MULTIPLE_TESTING_PLAN_MISSING"))
assert.ok(underpowered.reviewerActions.some((action) => action.code === "SOFTEN_OR_REPOWER_CLAIM"))

const rareEvent = packet.decisions.find((decision) => decision.id === "SP-HOLD-003")
assert.equal(rareEvent.status, "hold")
assert.ok(rareEvent.findings.some((finding) => finding.code === "PREREGISTRATION_MISSING"))
assert.ok(rareEvent.findings.some((finding) => finding.code === "UNDERPOWERED_CLAIM"))
assert.ok(rareEvent.powerAssessment.requiredPerGroup > 1000)

const singleCell = packet.decisions.find((decision) => decision.id === "SP-REV-004")
assert.equal(singleCell.status, "revise")
assert.ok(singleCell.findings.some((finding) => finding.code === "ANALYSIS_PLAN_NOT_DECLARED"))

assert.equal(requiredPerGroup(studyClaims[0], reviewPolicy), supported.powerAssessment.requiredPerGroup)

console.log("study-power-feasibility-assistant tests passed")
