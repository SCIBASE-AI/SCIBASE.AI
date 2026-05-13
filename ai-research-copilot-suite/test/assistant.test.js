import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDashboard,
  buildPeerReviewReport,
  buildReproducibilityCheck,
  findResearchGaps,
} from "../src/assistant.js";

test("peer review flags overstated claims and missing citations", () => {
  const report = buildPeerReviewReport();
  assert.equal(report.projectId, "organoid-response-atlas");
  assert.ok(report.score < 100);
  assert.ok(report.findings.some((finding) => finding.id === "overstated-translational-claim"));
  assert.ok(report.findings.some((finding) => finding.id === "missing-citations"));
});

test("reproducibility check returns confidence and previous attempts", () => {
  const check = buildReproducibilityCheck();
  assert.equal(check.status, "ready");
  assert.ok(check.confidence >= 80);
  assert.equal(check.previousAttempts.length, 2);
  assert.equal(check.sandboxPlan.compareOutputs, true);
});

test("research gaps are ranked by project relevance and replication need", () => {
  const gaps = findResearchGaps();
  assert.equal(gaps.opportunities.length, 3);
  assert.ok(gaps.opportunities[0].score >= gaps.opportunities[1].score);
  assert.ok(gaps.opportunities[0].signals.replicationGap >= 1);
});

test("dashboard combines every assistant surface", () => {
  const dashboard = buildDashboard();
  assert.equal(dashboard.project.artifactCount, 4);
  assert.ok(dashboard.peerReview.findings.length > 0);
  assert.ok(dashboard.reproducibility.previousAttempts.length > 0);
  assert.ok(dashboard.researchGaps.opportunities.length > 0);
});
