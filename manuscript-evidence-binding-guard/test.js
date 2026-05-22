import assert from "node:assert/strict"
import { evaluateEvidenceBinding } from "./index.js"
import { evidenceBindingInput } from "./sample-data.js"

const clone = (value) => JSON.parse(JSON.stringify(value))

const evaluation = evaluateEvidenceBinding(evidenceBindingInput)

assert.equal(evaluation.summary.status, "hold")
assert.equal(evaluation.summary.claimsReviewed, 3)
assert.equal(evaluation.summary.assetsReviewed, 3)
assert.equal(evaluation.summary.claimsHeld, 2)
assert.equal(evaluation.summary.assetsHeld, 1)
assert.equal(evaluation.summary.criticalFindings, 7)
assert.ok(evaluation.auditDigest.length >= 16)

const aqClaim = evaluation.claimResults.find((claim) => claim.id === "claim-air-quality-control")
assert.equal(aqClaim.status, "hold")
assert.ok(aqClaim.findings.some((finding) => finding.code === "evidence_digest_drift"))
assert.ok(aqClaim.findings.some((finding) => finding.code === "upstream_source_digest_drift"))

const interventionClaim = evaluation.claimResults.find((claim) => claim.id === "claim-causal-language")
assert.equal(interventionClaim.status, "hold")
assert.ok(interventionClaim.findings.some((finding) => finding.code === "required_evidence_type_missing"))
assert.ok(interventionClaim.findings.some((finding) => finding.code === "section_not_locked"))
assert.ok(interventionClaim.findings.some((finding) => finding.code === "citation_binding_missing"))
assert.ok(interventionClaim.findings.some((finding) => finding.code === "section_version_mismatch"))

const cleanInput = clone(evidenceBindingInput)
cleanInput.manuscript.sections.find((section) => section.id === "sec-discussion").locked = true
cleanInput.evidence.find((item) => item.id === "ev-notebook-aq-control").currentDigest =
  "sha256:aq_control_output_20260520"
cleanInput.evidence.find((item) => item.id === "ev-notebook-aq-control").currentUpstreamDigests = [
  "sha256:er_visits_v5",
  "sha256:aq_panel_v3",
]
cleanInput.evidence.find((item) => item.id === "ev-notebook-aq-control").staleAfter = null
cleanInput.evidence.find((item) => item.id === "ev-notebook-intervention").sectionVersionHash =
  "sec_discussion_v9_0b12"
cleanInput.evidence.find((item) => item.id === "ev-notebook-intervention").locked = true
cleanInput.evidence.find((item) => item.id === "ev-notebook-intervention").approvedAt =
  "2026-05-21T17:10:00Z"
cleanInput.evidence.find((item) => item.id === "ev-notebook-intervention").citationKey =
  "miller2026intervention"
cleanInput.evidence.find((item) => item.id === "ev-notebook-intervention").doi =
  "10.5555/intervention.2026.011"
cleanInput.manuscript.claims.find((claim) => claim.id === "claim-causal-language").citationKeys = [
  "miller2026intervention",
]
cleanInput.manuscript.claims.find((claim) => claim.id === "claim-causal-language").evidenceAnchorIds = [
  "ev-notebook-intervention",
  "ev-dataset-er-visits",
]

const cleanEvaluation = evaluateEvidenceBinding(cleanInput)
assert.equal(cleanEvaluation.summary.status, "clear")
assert.equal(cleanEvaluation.summary.claimsHeld, 0)
assert.equal(cleanEvaluation.summary.assetsHeld, 0)
assert.equal(cleanEvaluation.summary.reviewerActions, 0)

console.log("All manuscript evidence binding guard tests passed.")
