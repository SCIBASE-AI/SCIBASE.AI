import test from "node:test";
import assert from "node:assert/strict";
import { samplePaper, researcherProfile } from "../src/sample-data.js";
import {
  buildCitationToolkit,
  buildPeerReviewAid,
  buildResearchToolsDashboard,
  buildToolRegistry,
  evaluateGuardrails,
  formatCitation,
  planAssistedWorkflow,
  summarizePaper
} from "../src/tools.js";

test("tool registry exposes MVP contracts", () => {
  const registry = buildToolRegistry();
  assert.equal(registry.length, 5);
  assert.ok(registry.every((tool) => tool.inputs.length > 0 && tool.outputs.length > 0));
  assert.deepEqual(
    registry.map((tool) => tool.id),
    ["paper-summarizer", "peer-review-aid", "citation-helper", "guardrail-evaluator", "workflow-planner"]
  );
});

test("paper summarizer returns traceable findings and limitations", () => {
  const summary = summarizePaper(samplePaper);
  assert.equal(summary.paperId, samplePaper.id);
  assert.ok(summary.tldr.includes("low-temperature oxide process"));
  assert.ok(summary.keyFindings.some((finding) => finding.claimId === "c1"));
  assert.ok(summary.limitations.some((limitation) => limitation.includes("small wafer count")));
  assert.ok(summary.evidenceSnippets.some((snippet) => snippet.supported === false));
});

test("peer-review aid flags unsupported production-readiness claim", () => {
  const review = buildPeerReviewAid(samplePaper, { strictness: "high" });
  assert.equal(review.checks.find((check) => check.id === "methods-present").passed, true);
  assert.equal(review.checks.find((check) => check.id === "claim-support").passed, false);
  assert.equal(review.redFlags[0].claimId, "c3");
  assert.ok(review.actionItems.includes("Qualify or remove unsupported production-readiness claim"));
});

test("citation formatter emits APA, MLA, BibTeX, DOI, and schema.org data", () => {
  assert.ok(formatCitation(samplePaper, "apa").startsWith("Shah, M."));
  assert.ok(formatCitation(samplePaper, "mla").includes("\"Open Materials"));
  assert.ok(formatCitation(samplePaper, "bibtex").includes("@article{shah2026oxide"));
  const toolkit = buildCitationToolkit(samplePaper, ["apa", "bibtex"]);
  assert.equal(toolkit.doi, `https://doi.org/${samplePaper.doi}`);
  assert.equal(toolkit.schemaOrg["@type"], "ScholarlyArticle");
});

test("guardrails route unsupported claims to human review", () => {
  const guardrails = evaluateGuardrails(samplePaper);
  assert.deepEqual(guardrails.unsupportedClaims, ["c3"]);
  assert.ok(guardrails.humanReviewGates.includes("unsupported-claims"));
  assert.ok(guardrails.hallucinationControls.some((control) => control.includes("claimId")));
});

test("workflow planner composes deterministic tool run", () => {
  const workflow = planAssistedWorkflow(samplePaper, researcherProfile);
  assert.equal(workflow.runMode, "deterministic-local-mvp");
  assert.equal(workflow.orderedSteps.length, 4);
  assert.ok(workflow.artifacts.includes("summary.json"));
  assert.deepEqual(workflow.reviewCheckpoints, ["peer-review-aid", "guardrail-evaluator"]);
});

test("dashboard combines MVP outputs for reviewer", () => {
  const dashboard = buildResearchToolsDashboard(samplePaper, researcherProfile);
  assert.equal(dashboard.registry.length, 5);
  assert.equal(dashboard.summary.paperId, samplePaper.id);
  assert.equal(dashboard.review.redFlags.length, 1);
  assert.equal(dashboard.citations.schemaOrg.identifier, samplePaper.doi);
  assert.ok(dashboard.workflow.artifacts.includes("review-aid.json"));
  assert.equal(dashboard.readyForReviewer, true);
});
