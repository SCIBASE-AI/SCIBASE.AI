"use strict";

const assert = require("assert");
const { findResearchGaps, renderMarkdownReport, buildCandidateIntersections, topicKey } = require("./index");
const { neuroInflammationCorpus } = require("./sample-data");

assert.strictEqual(topicKey(["Microglia", "crispr", "microglia"]), "crispr + microglia");

const candidates = buildCandidateIntersections(neuroInflammationCorpus, {
  targetTopics: ["microglia", "wearables"],
  minIntersectionSize: 2,
  maxIntersectionSize: 3,
});
assert.ok(candidates.length > 0, "expected candidate intersections");

const report = findResearchGaps(neuroInflammationCorpus, {
  currentYear: 2026,
  targetTopics: ["microglia", "wearables", "digital biomarkers"],
  minIntersectionSize: 2,
  maxIntersectionSize: 3,
  limit: 8,
});

assert.ok(report.summary.opportunitiesFound >= 4, "expected several ranked opportunities");
assert.ok(report.summary.topScore >= 60, `expected strong top score, got ${report.summary.topScore}`);
const topKeys = report.opportunities.map((opportunity) => opportunity.key);
assert.ok(
  topKeys.some((key) => key.includes("crispr") && key.includes("microglia")),
  "expected CRISPR/microglia opportunity"
);
assert.ok(
  topKeys.some((key) => key.includes("wearables") && key.includes("lupus")),
  "expected wearables/lupus opportunity"
);
assert.ok(
  report.opportunities.some((opportunity) => opportunity.negativeOrMixedCount > 0),
  "expected negative or mixed result follow-up"
);
assert.ok(
  report.opportunities.some((opportunity) => opportunity.labCapabilities.length > 0),
  "expected lab capability matching"
);

const repeat = findResearchGaps(neuroInflammationCorpus, {
  currentYear: 2026,
  targetTopics: ["microglia", "wearables", "digital biomarkers"],
  minIntersectionSize: 2,
  maxIntersectionSize: 3,
  limit: 8,
});
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "digest should be stable");

const markdown = renderMarkdownReport(report);
assert.ok(markdown.includes("Research Gap Finder"));
assert.ok(markdown.includes(report.summary.auditDigest));
assert.ok(markdown.includes("Ranked Opportunities"));

console.log("research-gap-finder tests passed");
