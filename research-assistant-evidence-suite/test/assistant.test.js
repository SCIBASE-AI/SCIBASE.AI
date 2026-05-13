import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAssistantDashboard, buildPeerReviewReport, buildReproducibilityReport, findResearchGaps } from "../src/assistant.js";
import { researcherProfile, sampleCorpus, sampleProject } from "../src/sample-data.js";

test("peer review report flags evidence and citation risks", () => {
  const report = buildPeerReviewReport(sampleProject);

  assert.equal(report.projectId, sampleProject.id);
  assert.equal(report.template, "Molecular biology");
  assert.equal(report.status, "revise-before-release");
  assert.ok(report.findings.some((finding) => finding.category === "scope-alignment"));
  assert.ok(report.findings.some((finding) => finding.category === "citations"));
});

test("reproducibility report preserves prior attempts and missing artifacts", () => {
  const report = buildReproducibilityReport(sampleProject);

  assert.equal(report.recommendedCommand, "snakemake --cores 4 reproduce");
  assert.equal(report.priorAttempts.length, 2);
  assert.ok(report.confidenceScore < 100);
  assert.ok(report.checks.some((check) => check.status === "warning" && check.check === "artifact:validation-images"));
});

test("research gap finder ranks profile-fit replication gap first", () => {
  const gaps = findResearchGaps(sampleProject, sampleCorpus, researcherProfile);

  assert.equal(gaps[0].id, "gap-crispr-organoid-replication");
  assert.ok(gaps[0].opportunityScore > gaps[1].opportunityScore);
  assert.match(gaps[0].recommendedNextStep, /replication-first/);
});

test("dashboard combines all assistant lanes", () => {
  const dashboard = buildAssistantDashboard(sampleProject, sampleCorpus, researcherProfile);

  assert.equal(dashboard.project.id, sampleProject.id);
  assert.equal(dashboard.summary.blockerCount, 1);
  assert.ok(dashboard.readinessScore > 0);
  assert.ok(Array.isArray(dashboard.researchGaps));
});
