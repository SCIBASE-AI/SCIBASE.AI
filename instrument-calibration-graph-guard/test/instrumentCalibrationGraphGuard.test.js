import assert from "node:assert/strict"
import packets from "../examples/instrument-graph-packets.json" with { type: "json" }
import { evaluateInstrumentGraphBatch, evaluateInstrumentGraphPacket, summarize } from "../src/index.js"

const now = "2026-06-12T00:00:00Z"
const [ready, hold, blocked] = evaluateInstrumentGraphBatch(packets, { now })

assert.equal(ready.decision, "PUBLISH_GRAPH_EDGE")
assert.equal(ready.summary.blocks, 0)
assert.equal(ready.summary.reviews, 0)
assert.ok(ready.findings.some((finding) => finding.code === "calibration_current"))

assert.equal(hold.decision, "HOLD_FOR_CURATOR")
assert.ok(hold.findings.some((finding) => finding.code === "calibration_expired"))
assert.equal(hold.summary.blocks, 0)

assert.equal(blocked.decision, "BLOCK_RECOMMENDATION")
assert.ok(blocked.findings.some((finding) => finding.code === "calibration_certificate_missing"))
assert.ok(blocked.findings.some((finding) => finding.code === "calibration_revoked"))
assert.ok(blocked.findings.some((finding) => finding.code === "experiment_outside_calibration_window"))
assert.ok(blocked.findings.some((finding) => finding.code === "recommendation_without_hold_control"))

const missingIdentity = structuredClone(packets[0])
delete missingIdentity.instrument.serialNumber
const missingIdentityResult = evaluateInstrumentGraphPacket(missingIdentity, { now })
assert.equal(missingIdentityResult.decision, "BLOCK_RECOMMENDATION")
assert.ok(missingIdentityResult.findings.some((finding) => finding.code === "instrument_identity_incomplete"))

const noTargets = structuredClone(packets[0])
noTargets.recommendationTargets = []
const noTargetsResult = evaluateInstrumentGraphPacket(noTargets, { now })
assert.equal(noTargetsResult.decision, "HOLD_FOR_CURATOR")
assert.ok(noTargetsResult.findings.some((finding) => finding.code === "recommendation_targets_missing"))

const batchSummary = summarize([ready, hold, blocked])
assert.equal(batchSummary.blocks, blocked.summary.blocks)
assert.equal(batchSummary.reviews, hold.summary.reviews + blocked.summary.reviews)

console.log("instrument calibration graph guard tests passed")
