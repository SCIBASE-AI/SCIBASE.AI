import test from "node:test";
import assert from "node:assert/strict";
import {
  composeResearchAssistantReport,
  loadCitationCorpus,
  loadSampleManuscript,
  recommendCitations,
  reviewManuscript,
  summarizePaper
} from "../src/research-tools.js";

test("generates mode-specific paper summaries with findings and next steps", () => {
  const manuscript = loadSampleManuscript();
  const executive = summarizePaper(manuscript, "executive");
  const layperson = summarizePaper(manuscript, "layperson");

  assert.equal(executive.mode, "executive");
  assert.notEqual(executive.summary, layperson.summary);
  assert.ok(executive.keyFindings.length >= 3);
  assert.ok(executive.nextSteps.some((step) => step.includes("confidence intervals")));
});

test("flags peer-review diagnostics for missing ethics and statistics gaps", () => {
  const review = reviewManuscript(loadSampleManuscript());
  const ids = new Map(review.diagnostics.map((item) => [item.id, item.severity]));

  assert.equal(review.overallRisk, "needs_revision");
  assert.equal(ids.get("ethics_statement"), "warning");
  assert.equal(ids.get("statistical_reporting"), "warning");
  assert.equal(ids.get("similarity_risk"), "pass");
});

test("recommends and formats context-aware citations", () => {
  const citations = recommendCitations(loadSampleManuscript(), loadCitationCorpus(), { style: "nature" });

  assert.ok(citations.length >= 4);
  assert.equal(citations[0].doi, "10.1038/s41592-019-0654-x");
  assert.ok(citations[0].formatted.includes("https://doi.org/"));
});

test("composes a complete assistant report for API and dashboard use", () => {
  const report = composeResearchAssistantReport(loadSampleManuscript());

  assert.equal(report.manuscript.id, "ms-neuro-climate-2026");
  assert.equal(Object.keys(report.summaries).length, 3);
  assert.ok(report.review.suggestedActions.length >= 2);
  assert.ok(report.similarPapersWidget.length > 0);
});
