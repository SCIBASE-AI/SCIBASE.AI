const assert = require("assert");
const { sampleProject } = require("./sample-data");
const {
  buildSentinelReport,
  normalizeNoticeType,
  digest
} = require("./index");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testRetractedPrimaryEvidenceBlocksRelease() {
  const report = buildSentinelReport(sampleProject);
  assert.strictEqual(report.releaseGate.status, "hold");
  assert.strictEqual(report.summary.blockers, 1);
  assert.strictEqual(report.summary.high, 1);
  assert(report.summary.score < 20);
  assert(report.claimDecisions.find((claim) => claim.claimId === "C-101").status === "quarantine");
  assert(report.reviewerActions[0].priority === "blocker");
}

function testMajorCorrectionProducesRevisionAction() {
  const report = buildSentinelReport(sampleProject);
  const finding = report.referenceFindings.find((item) => item.referenceId === "REF-EFFECT-CORRECTED");
  assert.strictEqual(finding.noticeType, "major_correction");
  assert.strictEqual(finding.severity, "medium");
  assert(finding.remediation.includes("0.08 standardized mean difference"));
  assert.strictEqual(report.claimDecisions.find((claim) => claim.claimId === "C-318").status, "revise");
}

function testSupersededPreprintIncludesReplacement() {
  const report = buildSentinelReport(sampleProject);
  const finding = report.referenceFindings.find((item) => item.referenceId === "REF-PREPRINT-SUPERSEDED");
  assert.strictEqual(finding.noticeType, "superseded_preprint");
  assert.strictEqual(finding.replacement.doi, "10.5555/synthetic.benchmark.2026.009");
  assert(finding.remediation.includes("Review replacement record"));
}

function testCleanProjectPasses() {
  const clean = clone(sampleProject);
  for (const reference of clean.references) {
    reference.status = "active";
    delete reference.notice;
    delete reference.replacement;
    delete reference.correctedEffect;
  }
  const report = buildSentinelReport(clean);
  assert.strictEqual(report.releaseGate.status, "pass");
  assert.strictEqual(report.summary.score, 100);
  assert.strictEqual(report.summary.quarantinedClaims, 0);
  assert.strictEqual(report.reviewerActions.length, 0);
}

function testNormalizationAndDigestAreDeterministic() {
  assert.strictEqual(normalizeNoticeType("Expression of Concern"), "expression_of_concern");
  assert.strictEqual(normalizeNoticeType("erratum"), "major_correction");
  const first = buildSentinelReport(sampleProject);
  const second = buildSentinelReport(clone(sampleProject));
  assert.strictEqual(first.auditDigest, second.auditDigest);
  assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));
}

testRetractedPrimaryEvidenceBlocksRelease();
testMajorCorrectionProducesRevisionAction();
testSupersededPreprintIncludesReplacement();
testCleanProjectPasses();
testNormalizationAndDigestAreDeterministic();

console.log("5 retraction notice citation sentinel tests passed");
