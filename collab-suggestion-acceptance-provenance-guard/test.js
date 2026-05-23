const assert = require("node:assert/strict")
const { evaluateSuggestionAcceptanceProvenance } = require("./index")
const { manuscripts, policy } = require("./sample-data")

const packet = evaluateSuggestionAcceptanceProvenance({
  asOf: "2026-05-23T21:30:00.000Z",
  manuscripts,
  policy,
})

assert.equal(packet.summary.totalManuscripts, 2)
assert.equal(packet.summary.totalSuggestions, 4)
assert.equal(packet.summary.acceptedSuggestions, 2)
assert.equal(packet.summary.deferredSuggestions, 1)
assert.equal(packet.summary.escalatedSuggestions, 1)
assert.equal(packet.acceptQueue.length, 2)
assert.equal(packet.deferQueue.length, 1)
assert.equal(packet.escalationQueue.length, 1)

const immune = packet.manuscripts.find((manuscript) => manuscript.manuscriptId === "immune-response-manuscript")
assert.equal(immune.status, "acceptance_blocked")

const safe = immune.suggestions.find((suggestion) => suggestion.suggestionId === "sug-safe-il6-wording")
assert.equal(safe.decision, "accept")
assert.equal(safe.findings.length, 0)
assert.equal(typeof safe.provenanceDigest, "string")
assert.equal(safe.provenanceDigest.length, 64)

const deferred = immune.suggestions.find((suggestion) => suggestion.suggestionId === "sug-stale-crp-result")
assert.equal(deferred.decision, "defer")
assert(deferred.findings.some((finding) => finding.code === "notebook_outputs_fresh"))
assert.equal(deferred.findings.some((finding) => finding.severity === "critical"), false)

const escalated = immune.suggestions.find((suggestion) => suggestion.suggestionId === "sug-stale-methods-anchor")
assert.equal(escalated.decision, "escalate")
assert(escalated.findings.some((finding) => finding.code === "section_version_hash_current"))
assert(escalated.findings.some((finding) => finding.code === "quote_anchor_stable"))
assert(escalated.findings.some((finding) => finding.code === "required_author_approvals_present"))
assert(escalated.findings.some((finding) => finding.code === "blocking_replies_resolved"))

const materials = packet.manuscripts.find((manuscript) => manuscript.manuscriptId === "materials-catalyst-draft")
assert.equal(materials.status, "acceptance_ready")
assert.equal(materials.summary.accepted, 1)

const repeated = evaluateSuggestionAcceptanceProvenance({
  asOf: "2026-05-23T21:30:00.000Z",
  manuscripts,
  policy,
})
assert.equal(repeated.audit.digest, packet.audit.digest)

console.log("collaborative suggestion acceptance provenance guard tests passed")
