const assert = require("node:assert/strict")
const { evaluateEthicsProvenance, evaluateEvidence, buildJsonLdPacket } = require("./index")
const { sampleRecommendations, sampleUserContext } = require("./sample-data")

const packet = evaluateEthicsProvenance({
  recommendations: sampleRecommendations,
  userContext: sampleUserContext,
})

const byId = Object.fromEntries(packet.decisions.map((decision) => [decision.recommendationId, decision]))

assert.equal(byId["rec-safe-open-protocol"].status, "show")
assert.equal(byId["rec-safe-open-protocol"].blockers.length, 0)

assert.equal(byId["rec-human-cohort-transfer"].status, "hold")
assert.ok(byId["rec-human-cohort-transfer"].blockers.some((blocker) => blocker.code === "consent_scope_mismatch"))
assert.ok(byId["rec-human-cohort-transfer"].blockers.some((blocker) => blocker.code === "restricted_data_without_dua"))

assert.equal(byId["rec-bsl2-protocol"].status, "hold")
assert.ok(byId["rec-bsl2-protocol"].blockers.some((blocker) => blocker.code === "biosafety_clearance_gap"))
assert.ok(byId["rec-bsl2-protocol"].warnings.some((warning) => warning.code === "dual_use_review"))

assert.equal(byId["rec-animal-study"].status, "hold")
assert.ok(byId["rec-animal-study"].curatorActions.some((action) => action.code === "missing_animal_protocol"))

assert.equal(packet.audit.visible, 1)
assert.equal(packet.audit.held, 3)
assert.match(packet.audit.digest, /^[a-f0-9]{64}$/)

const humanEvidenceCheck = evaluateEvidence(sampleRecommendations[1].evidence[0], {
  ...sampleUserContext,
  hasActiveIrbProtocol: false,
})
assert.ok(humanEvidenceCheck.blockers.some((blocker) => blocker.code === "missing_irb"))

const jsonLd = buildJsonLdPacket(sampleRecommendations[0], byId["rec-safe-open-protocol"])
assert.equal(jsonLd["@type"], "Recommendation")
assert.equal(jsonLd.ethicsReview["@type"], "Review")
assert.equal(jsonLd.about.length, 2)

console.log("knowledge-graph-ethics-provenance-guard tests passed")
