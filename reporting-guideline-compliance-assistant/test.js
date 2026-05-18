const assert = require("node:assert/strict")
const {
  auditResearchPackage,
  selectGuideline,
} = require("./index")

function testClinicalTrialMissingReportingItems() {
  const audit = auditResearchPackage({
    studyType: "clinical_trial",
    manuscript: {
      title: "Remote monitoring intervention for hypertension",
      abstract:
        "We randomized participants to a dashboard intervention and measured blood pressure after 12 weeks.",
      methods:
        "Participants were randomized into two groups. The intervention used a remote monitoring dashboard.",
      results: "The intervention group improved systolic blood pressure by 4 mmHg.",
    },
    artifacts: {
      protocol: "protocol-v1.pdf",
    },
  })

  assert.equal(selectGuideline("clinical_trial").id, "CONSORT")
  assert.equal(audit.guideline.id, "CONSORT")
  assert.ok(
    audit.peerReviewFindings.some(
      (finding) =>
        finding.id === "consort-participant-flow" &&
        finding.status === "missing" &&
        finding.severity === "high",
    ),
  )
  assert.ok(
    audit.peerReviewFindings.some(
      (finding) => finding.id === "consort-sample-size" && finding.status === "missing",
    ),
  )
  assert.deepEqual(audit.reproducibility.missing.sort(), [
    "analysisCode",
    "dataset",
    "environment",
  ])
  assert.equal(audit.readiness.gate, "hold_for_revision")
}

function testSystematicReviewReadyPacket() {
  const audit = auditResearchPackage({
    studyType: "systematic_review",
    manuscript: {
      title: "Systematic review of privacy-preserving federated learning",
      abstract:
        "We searched arXiv, PubMed, and ACM from 2019 to 2026. Inclusion criteria, exclusion criteria, and screening were predefined.",
      methods:
        "The protocol was preregistered. The search strategy used boolean queries. Two reviewers screened records. Risk of bias was assessed with a domain rubric.",
      results:
        "The PRISMA flow diagram reports 833 records, 72 full-text studies, and 41 included studies. Synthesis groups results by threat model.",
    },
    artifacts: {
      dataset: "screening-decisions.csv",
      analysisCode: "analysis/review-synthesis.js",
      environment: "environment.yml",
      protocol: "osf-preregistration",
    },
  })

  assert.equal(audit.guideline.id, "PRISMA")
  assert.equal(audit.readiness.gate, "ready_for_review")
  assert.ok(audit.scores.guideline >= 90)
  assert.ok(audit.scores.reproducibility >= 90)
  assert.equal(audit.peerReviewFindings.filter((finding) => finding.severity === "high").length, 0)
  assert.ok(audit.reviewerPacket.revisionActions.length <= 1)
}

function testReviewerPacketTiesFindingsToResearchGaps() {
  const audit = auditResearchPackage({
    studyType: "animal_study",
    manuscript: {
      title: "Mouse model pilot study",
      abstract: "A pilot experiment tested a therapeutic compound in mice.",
      methods: "Mice received treatment. Outcomes were measured at day 14.",
      results: "Treated mice had lower inflammatory markers.",
    },
    artifacts: {
      dataset: "mouse-results.csv",
      analysisCode: "analysis.py",
    },
  })

  assert.equal(audit.guideline.id, "ARRIVE")
  assert.ok(audit.researchGapSignals.length >= 2)
  assert.ok(
    audit.researchGapSignals.some((signal) =>
      signal.recommendedAction.includes("Add reporting evidence"),
    ),
  )
  assert.ok(audit.reviewerPacket.summary.includes("ARRIVE"))
  assert.ok(audit.reviewerPacket.revisionActions.length >= 2)
}

testClinicalTrialMissingReportingItems()
testSystematicReviewReadyPacket()
testReviewerPacketTiesFindingsToResearchGaps()

console.log("reporting-guideline-compliance-assistant tests passed")
