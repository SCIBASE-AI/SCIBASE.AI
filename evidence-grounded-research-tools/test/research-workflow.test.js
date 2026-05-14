import test from "node:test";
import assert from "node:assert/strict";
import {
  createBatchResearchPackets,
  createResearchPacket,
  extractFindings,
  normalizePaper,
  recommendCitations,
  runPeerReviewChecks,
  summarizePaper,
} from "../src/research-workflow.js";
import { samplePaper } from "../src/sample-paper.js";

test("normalizes paper sections and metadata", () => {
  const paper = normalizePaper(samplePaper);

  assert.equal(paper.id, "urban-heat-health-2026");
  assert.equal(paper.sections.results.includes("6.4% decrease"), true);
  assert.equal(paper.title, samplePaper.title);
});

test("supports abstract, executive, and layperson summaries", () => {
  assert.match(summarizePaper(samplePaper, "abstract").text, /Neighborhood tree canopy/);
  assert.match(summarizePaper(samplePaper, "executive").text, /Primary findings/);
  assert.match(summarizePaper(samplePaper, "layperson").text, /This paper studies/);
});

test("extracts evidence-linked findings with confidence", () => {
  const findings = extractFindings(samplePaper);

  assert.ok(findings.length >= 2);
  assert.equal(findings[0].section, "results");
  assert.ok(findings[0].confidence > 0.5);
  assert.match(findings[0].evidenceSpan, /tree canopy|emergency visits/i);
});

test("peer-review checks recognize present compliance statements", () => {
  const review = runPeerReviewChecks(samplePaper);

  assert.equal(review.severityCounts.high, 0);
  assert.equal(review.risks.some((risk) => risk.id === "missing-data-availability"), false);
});

test("peer-review checks flag missing availability and ethics coverage", () => {
  const review = runPeerReviewChecks({
    title: "Survey of patient outcomes",
    abstract: "This survey found significant improvement in patient outcomes.",
    sections: {
      methods: "Participants completed a clinical survey.",
      results: "The intervention showed significant improvement in patient outcomes.",
    },
  });

  assert.equal(review.severityCounts.high, 2);
  assert.ok(review.risks.some((risk) => risk.id === "ethics-coverage"));
});

test("citation recommendations include reasons and formatted references", () => {
  const citations = recommendCitations(samplePaper, "nature");

  assert.ok(citations.length >= 2);
  assert.ok(citations[0].confidence >= citations.at(-1).confidence);
  assert.match(citations[0].formatted, /\(\d{4}\)\./);
});

test("research packet combines workflow outputs", () => {
  const packet = createResearchPacket(samplePaper, {
    summaryMode: "executive",
    citationStyle: "mla",
  });

  assert.equal(packet.document.id, samplePaper.id);
  assert.ok(packet.findings.length >= 2);
  assert.ok(packet.citations.length >= 2);
  assert.ok(packet.workflow.nextSteps.length >= 2);
});

test("batch packets create dashboard-ready summaries", () => {
  const packets = createBatchResearchPackets([samplePaper, samplePaper]);

  assert.equal(packets.length, 2);
  assert.equal(packets[0].workflow.dashboardSummary.findingCount, packets[1].workflow.dashboardSummary.findingCount);
});
