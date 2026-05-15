"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  analyzeScientificBountyRisk,
  compareSubmissions,
  contentFingerprint,
  detectTimingAndNetworkSignals,
  jaccardSimilarity,
} = require("./src/bounty-risk-controls");

const samplePath = path.join(__dirname, "sample-data.json");
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

{
  const score = jaccardSimilarity(
    "single cell microglia inflammatory biomarker validation",
    "microglia inflammatory marker validation from single-cell cohorts"
  );
  assert.ok(score >= 0.4, `expected related method text similarity, got ${score}`);
}

{
  const findings = compareSubmissions(sample.submissions);
  assert.ok(findings.some((finding) => finding.code === "shared-artifact-hash"));
  assert.ok(findings.some((finding) => finding.submissionIds.includes("sub-atlas") && finding.submissionIds.includes("sub-mirror")));
}

{
  const signals = detectTimingAndNetworkSignals(sample.submissions);
  assert.ok(signals.some((finding) => finding.code === "shared-anonymized-network"));
  assert.ok(signals.some((finding) => finding.code === "submission-burst"));
}

{
  const report = analyzeScientificBountyRisk(sample);
  assert.equal(report.challengeId, "challenge-biomarker-2026");
  assert.equal(report.summary.submissions, 4);
  assert.ok(report.summary.duplicateFindings >= 1);
  assert.ok(report.summary.conflictFindings >= 3);
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);

  const mirrorDecision = report.payoutDecisions.find((decision) => decision.submissionId === "sub-mirror");
  assert.equal(mirrorDecision.payoutStatus, "hold-for-arbitration");
  assert.ok(mirrorDecision.holdReasons.some((reason) => reason.code === "shared-artifact-hash"));
  assert.ok(mirrorDecision.holdReasons.some((reason) => reason.code === "sponsor-employee-reviewer"));

  const latticeDecision = report.payoutDecisions.find((decision) => decision.submissionId === "sub-lattice");
  assert.equal(latticeDecision.payoutStatus, "release-ready");
}

{
  const report = analyzeScientificBountyRisk(sample);
  const changed = clone(sample);
  changed.submissions[1].artifacts.push({
    name: "unexpected-shared-table.csv",
    hash: "sha256:atlas-biomarkers-001",
  });
  const updated = analyzeScientificBountyRisk(changed);
  assert.notEqual(updated.auditDigest, report.auditDigest);
  assert.notEqual(contentFingerprint(changed.submissions[1]), contentFingerprint(sample.submissions[1]));
}

{
  const invalid = clone(sample);
  delete invalid.reviewers;
  assert.throws(() => analyzeScientificBountyRisk(invalid), /missing required bundle array: reviewers/);
}

console.log("scientific-bounty-risk-controls tests passed");
