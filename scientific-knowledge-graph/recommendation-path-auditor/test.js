"use strict";

const assert = require("assert");
const {
  auditRecommendations,
  renderMarkdownReport,
  buildEdgeIndex,
  pathExists,
  computeEvidenceScore,
  daysBetween,
} = require("./index");
const { recommendationPacket } = require("./sample-data");

const edgeIndex = buildEdgeIndex(recommendationPacket.edges);
assert.strictEqual(pathExists(["paper-001", "protocol-lps", "dataset-raw-phi"], edgeIndex), true);
assert.strictEqual(pathExists(["paper-001", "protocol-lps", "tool-missing-schema"], edgeIndex), false);
assert.strictEqual(daysBetween("2026-04-28T00:00:00Z", "2026-05-28T20:20:00Z"), 31);
assert.ok(computeEvidenceScore([recommendationPacket.edges[0]], { featureWeights: { a: 1 } }) > 0);

const report = auditRecommendations(recommendationPacket);
const codes = new Set(report.findings.map((finding) => finding.code));

assert.strictEqual(report.summary.decision, "hold-recommendations");
assert.strictEqual(report.summary.riskScore, 100);
assert.ok(codes.has("PRIVATE_NODE_LEAK"), "missing private node leak detection");
assert.ok(codes.has("EXPLANATION_PATH_BROKEN"), "missing broken path detection");
assert.ok(codes.has("FILTER_VIOLATION"), "missing filter violation detection");
assert.ok(codes.has("RETRACTED_SOURCE_USED"), "missing retracted evidence detection");
assert.ok(codes.has("WEAK_EVIDENCE_SCORE"), "missing weak evidence detection");
assert.ok(codes.has("STALE_TREND_SIGNAL"), "missing stale trend signal detection");
assert.ok(codes.has("DUPLICATE_RECOMMENDATION"), "missing duplicate recommendation detection");
assert.ok(codes.has("MISSING_SCHEMA_METADATA"), "missing schema metadata detection");
assert.ok(codes.has("UNEXPLAINED_PERSONALIZATION"), "missing explainability detection");

const repeat = auditRecommendations(recommendationPacket);
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "digest should be stable");

const markdown = renderMarkdownReport(report);
assert.ok(markdown.includes("Recommendation Path Audit"));
assert.ok(markdown.includes("hold-recommendations"));
assert.ok(markdown.includes(report.summary.auditDigest));

console.log("recommendation-path-auditor tests passed");
