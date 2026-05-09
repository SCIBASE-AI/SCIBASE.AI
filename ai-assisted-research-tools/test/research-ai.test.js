import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboard, peerReviewAid, recommendCitations, summarizePaper } from "../src/research-ai.js";
import { manuscript } from "../src/data/open-corpus.js";

test("generates abstract, executive, and layperson summaries", () => {
  const abstract = summarizePaper(manuscript, "abstract");
  const executive = summarizePaper(manuscript, "executive");
  const layperson = summarizePaper(manuscript, "layperson");

  assert.equal(abstract.mode, "abstract");
  assert.match(executive.summary, /Recommended editorial focus/);
  assert.match(layperson.summary, /lab-grown/);
  assert.ok(executive.keyFindings.length >= 2);
  assert.ok(executive.nextSteps.some((step) => step.includes("confidence intervals")));
});

test("builds a peer review report with similarity, statistics, and compliance findings", () => {
  const report = peerReviewAid(manuscript, "biology");

  assert.equal(report.template, "biology");
  assert.ok(report.score < 100);
  assert.ok(report.issues.some((issue) => issue.type === "similarity"));
  assert.ok(report.issues.some((issue) => issue.type === "statistics"));
  assert.ok(report.checklist.some((item) => item.statement === "ethics" && item.present === false));
});

test("recommends and formats citations from the local open corpus", () => {
  const result = recommendCitations(manuscript, manuscript.highlightedText, "Nature");

  assert.equal(result.style, "Nature");
  assert.ok(result.recommendations.length >= 3);
  assert.ok(result.recommendations[0].score >= result.recommendations.at(-1).score);
  assert.ok(result.recommendations.every((paper) => paper.formatted.includes("https://doi.org/")));
  assert.ok(result.similarPapers.length > 0);
});

test("composes a dashboard payload for the demo UI", () => {
  const dashboard = buildDashboard(manuscript);

  assert.equal(dashboard.profile.manuscriptId, manuscript.id);
  assert.ok(dashboard.summaries.abstract.summary.length > 80);
  assert.ok(dashboard.review.issues.length >= 3);
  assert.ok(dashboard.citations.recommendations.length >= 3);
});
