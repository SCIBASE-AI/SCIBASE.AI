"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  analyzeReviewAssignmentGovernance,
  detectConflicts,
  evaluateReviewer,
  overlapScore,
  trustScore,
} = require("./src/review-assignment-governance");

const samplePath = path.join(__dirname, "sample-data.json");
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

{
  const score = overlapScore(["CRISPR", "microglia", "single-cell sequencing"], ["single cell RNA sequencing", "microglia atlas"]);
  assert.ok(score >= 0.25, `expected overlap for related scientific terms, got ${score}`);
}

{
  const reviewer = sample.reviewers.find((item) => item.id === "reviewer-ortiz");
  const trust = trustScore(reviewer.profile);
  assert.ok(trust > 65, `expected strong reviewer trust score, got ${trust}`);
}

{
  const reviewer = sample.reviewers.find((item) => item.id === "reviewer-shah");
  const conflicts = detectConflicts(sample.project, reviewer, sample.disclosures);
  assert.equal(conflicts.hardBlocked, true);
  assert.ok(conflicts.reasons.some((reason) => reason.code === "current-institution"));
}

{
  const reviewer = sample.reviewers.find((item) => item.id === "reviewer-meyer");
  const card = evaluateReviewer(sample.project, reviewer, sample.disclosures);
  assert.equal(card.status, "conditional");
  assert.ok(card.conflictReasons.some((reason) => reason.code === "shared-funder"));
}

{
  const report = analyzeReviewAssignmentGovernance(sample);
  assert.equal(report.assignmentDecision, "ready-for-invitation");
  assert.equal(report.selectedReviewers.length, 3);
  assert.deepEqual(
    report.selectedReviewers.map((reviewer) => reviewer.blindLabel),
    ["Reviewer A", "Reviewer B", "Reviewer C"]
  );
  assert.ok(report.selectedReviewers.some((reviewer) => reviewer.reviewerId === "reviewer-ortiz"));
  assert.ok(report.blockedReviewers.some((reviewer) => reviewer.reviewerId === "reviewer-shah"));
  assert.ok(report.blockedReviewers.some((reviewer) => reviewer.reviewerId === "reviewer-patel"));
  assert.equal(report.coverage.missing.length, 0);
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
}

{
  const changed = clone(sample);
  changed.disclosures.push({
    reviewerId: "reviewer-ortiz",
    type: "financial-interest",
    severity: "high",
    summary: "Reviewer has a direct financial interest in a competing assay."
  });
  const original = analyzeReviewAssignmentGovernance(sample);
  const updated = analyzeReviewAssignmentGovernance(changed);
  assert.notEqual(updated.auditDigest, original.auditDigest);
  assert.ok(updated.blockedReviewers.some((reviewer) => reviewer.reviewerId === "reviewer-ortiz"));
}

{
  const missing = clone(sample);
  delete missing.reviewers;
  assert.throws(() => analyzeReviewAssignmentGovernance(missing), /missing required bundle field: reviewers/);
}

console.log("peer-review-assignment-governance tests passed");
