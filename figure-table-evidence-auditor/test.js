"use strict";

const assert = require("node:assert/strict");
const { auditManuscript, findReferences, scoreClaimRisk } = require("./index");
const { manuscripts } = require("./sample-data");

function testReferenceParsing() {
  const refs = findReferences("Figure 1 and table 2 support this; Fig. 3 is exploratory.");
  assert.deepEqual(
    refs.map((ref) => ref.label),
    ["figure 1", "table 2", "figure 3"],
  );
}

function testRiskScoring() {
  assert.equal(scoreClaimRisk("The result improved by 12%.", []), 4);
  assert.equal(scoreClaimRisk("The result improved in Figure 1.", [{ label: "figure 1" }]), 1);
  assert.equal(scoreClaimRisk("The value was significant at p < 0.04 in Table 2.", [{ label: "table 2" }]), 3);
}

function testAuditFindsEvidenceProblems() {
  const audit = auditManuscript(manuscripts[0]);
  const codes = audit.findings.map((finding) => finding.code);

  assert.equal(audit.readiness, "hold-for-author-fix");
  assert.ok(codes.includes("missing-evidence-reference"));
  assert.ok(codes.includes("claim-needs-stronger-statistical-context"));
  assert.ok(codes.includes("unused-evidence-artifact"));
  assert.ok(codes.includes("caption-too-thin"));
  assert.equal(audit.citationActions[0].recommendation, "insert");
  assert.equal(audit.citationActions[1].recommendation, "defer");
  assert.match(audit.auditDigest, /^fta-[0-9a-f]{8}$/);
}

function testCleanDraftStaysReviewReady() {
  const audit = auditManuscript(manuscripts[1]);
  const highSeverity = audit.findings.filter((finding) => finding.severity === "high");

  assert.equal(highSeverity.length, 0);
  assert.equal(audit.readiness, "ready-for-human-review");
  assert.equal(audit.citationActions[0].recommendation, "insert");
}

function run() {
  testReferenceParsing();
  testRiskScoring();
  testAuditFindsEvidenceProblems();
  testCleanDraftStaysReviewReady();
  console.log("figure-table-evidence-auditor tests passed");
}

run();
