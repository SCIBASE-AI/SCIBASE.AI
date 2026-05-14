import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDashboard,
  createPaperSummary,
  createPeerReview,
  recommendCitations,
  runResearchWorkflow
} from "../src/research-tools.js";
import { citationLibrary, sampleProject } from "../src/sample-data.js";

test("createPaperSummary supports multiple reviewer-facing modes", () => {
  const abstract = createPaperSummary(sampleProject, { mode: "abstract" });
  const executive = createPaperSummary(sampleProject, { mode: "executive" });
  const layperson = createPaperSummary(sampleProject, { mode: "layperson" });

  assert.equal(abstract.mode, "abstract");
  assert.equal(executive.mode, "executive");
  assert.equal(layperson.mode, "layperson");
  assert.equal(abstract.metrics.claimCount, 3);
  assert.equal(abstract.metrics.supportedClaimCount, 2);
  assert.ok(layperson.summary.includes("algae"));
});

test("createPaperSummary rejects unknown modes", () => {
  assert.throws(
    () => createPaperSummary(sampleProject, { mode: "tweet" }),
    /Unknown summary mode/
  );
});

test("createPeerReview flags unsupported claims and reproducibility gaps", () => {
  const review = createPeerReview(sampleProject);

  assert.equal(review.verdict, "needs-major-revision");
  assert.ok(review.score < 85);
  assert.ok(review.findings.some((finding) => finding.target === "claim-transfer" && finding.severity === "high"));
  assert.ok(review.recommendedActions.length > 0);
});

test("recommendCitations ranks relevant missing papers and excludes existing references", () => {
  const citations = recommendCitations(sampleProject, citationLibrary, { limit: 2 });

  assert.equal(citations.length, 2);
  assert.equal(citations[0].id, "ortega-2025-heat-pulse-assays");
  assert.ok(citations.every((citation) => citation.id !== "smith-2024-marine-heatwaves"));
  assert.ok(citations[0].formats.apa.includes("https://doi.org/"));
});

test("runResearchWorkflow composes all MVP tools with guardrail traces", () => {
  const workflow = runResearchWorkflow(sampleProject, citationLibrary);

  assert.equal(workflow.projectId, sampleProject.id);
  assert.equal(workflow.summary.mode, "executive");
  assert.ok(workflow.review.findings.length > 0);
  assert.ok(workflow.citations.length > 0);
  assert.ok(workflow.guardrails.some((guardrail) => guardrail.id === "no-hidden-model-call"));
});

test("createDashboard returns compact cards for a product surface", () => {
  const dashboard = createDashboard(sampleProject, citationLibrary);

  assert.equal(dashboard.title, sampleProject.title);
  assert.equal(dashboard.cards.length, 4);
  assert.ok(dashboard.cards.some((card) => card.label === "Peer Review Score"));
});
