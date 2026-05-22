const assert = require("node:assert/strict")
const { evaluateMultipleComparisonControls } = require("./index")
const { manuscripts, policy } = require("./sample-data")

const packet = evaluateMultipleComparisonControls({
  asOf: "2026-05-23T03:00:00.000Z",
  manuscripts,
  policy,
})

assert.equal(packet.summary.totalManuscripts, 3)
assert.equal(packet.summary.readyManuscripts, 1)
assert.equal(packet.summary.statisticalReviewManuscripts, 0)
assert.equal(packet.summary.reviseManuscripts, 2)
assert.equal(packet.summary.totalFamilies, 3)
assert.equal(packet.summary.totalTests, 15)
assert.equal(packet.summary.criticalFindings, 5)
assert.equal(packet.summary.warningFindings, 2)
assert.equal(packet.readyQueue.length, 1)
assert.equal(packet.readyQueue[0].manuscriptId, "cardio-biomarker-study")

const cardio = packet.manuscripts.find((manuscript) => manuscript.manuscriptId === "cardio-biomarker-study")
assert.equal(cardio.status, "peer_review_ready")
assert(cardio.families[0].checks.every((check) => check.pass))

const neuro = packet.manuscripts.find((manuscript) => manuscript.manuscriptId === "neuro-screening-draft")
assert.equal(neuro.status, "revise_before_submission")
assert(neuro.findings.some((finding) => finding.code === "correction_method_allowed"))
assert(neuro.findings.some((finding) => finding.code === "adjusted_values_present"))
assert(neuro.findings.some((finding) => finding.code === "unadjusted_significance_claim"))
assert(neuro.findings.some((finding) => finding.code === "endpoint_hierarchy_covered"))

const adjustedFinding = neuro.findings.find((finding) => finding.code === "adjusted_values_present")
assert.deepEqual(adjustedFinding.evidence.missingTestIds, ["memory", "attention", "language", "mood"])

const metabolomics = packet.manuscripts.find((manuscript) => manuscript.manuscriptId === "metabolomics-exploration")
assert.equal(metabolomics.status, "revise_before_submission")
assert(metabolomics.findings.some((finding) => finding.code === "unadjusted_significance_claim"))
assert(metabolomics.findings.some((finding) => finding.code === "fdr_threshold_consistency"))
assert(metabolomics.findings.some((finding) => finding.code === "exploratory_labeling"))

const cleanSingle = evaluateMultipleComparisonControls({
  asOf: "2026-05-23T03:00:00.000Z",
  manuscripts: [{
    manuscriptId: "clean-single-endpoint",
    title: "Clean Single Endpoint",
    analysisFamilies: [{
      familyId: "primary",
      label: "Primary endpoint",
      intent: "confirmatory",
      declaredFamilySize: 1,
      correctionMethod: "pre-registered-hierarchy",
      endpointHierarchy: { primaryEndpoints: ["survival"] },
      tests: [{
        testId: "survival",
        outcome: "Survival",
        pValue: 0.012,
        hierarchyDecision: "primary_endpoint_passed",
        claimedSignificant: true,
      }],
    }],
    resultStatements: [{
      familyId: "primary",
      claimId: "claim-clean",
      testId: "survival",
      text: "The pre-registered primary endpoint passed the hierarchy.",
      usesSignificanceLanguage: true,
    }],
  }],
  policy,
})
assert.equal(cleanSingle.summary.readyManuscripts, 1)
assert.equal(cleanSingle.summary.totalFindings, 0)

const repeated = evaluateMultipleComparisonControls({
  asOf: "2026-05-23T03:00:00.000Z",
  manuscripts,
  policy,
})
assert.equal(repeated.audit.digest, packet.audit.digest)

console.log("multiple comparison control assistant tests passed")
