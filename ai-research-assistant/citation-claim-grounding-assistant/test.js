"use strict";

const assert = require("assert");
const { analyzeManuscript, renderMarkdownReview } = require("./index");
const { neuroCalmManuscript } = require("./sample-data");

const report = analyzeManuscript(neuroCalmManuscript, { currentYear: 2026 });
const codes = new Set(report.findings.map((finding) => finding.code));

assert.strictEqual(report.summary.decision, "revise-before-submission");
assert.ok(report.summary.riskScore >= 90, `expected high risk score, got ${report.summary.riskScore}`);
assert.ok(report.summary.criticalFindings >= 2, "expected at least two critical findings");
assert.ok(codes.has("MISSING_CITATION"), "missing unsupported claim detection");
assert.ok(codes.has("NUMERIC_VALUE_UNGROUNDED"), "missing numeric grounding detection");
assert.ok(codes.has("CONTRADICTED_CLAIM"), "missing contradiction detection");
assert.ok(codes.has("OVERSTATED_CERTAINTY"), "missing certainty detection");
assert.ok(codes.has("NON_PEER_REVIEWED_FOUNDATION"), "missing non-peer-reviewed foundation detection");
assert.ok(codes.has("LOW_RELEVANCE_CITATION"), "missing weak citation match detection");

const repeat = analyzeManuscript(neuroCalmManuscript, { currentYear: 2026 });
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "digest should be stable");

const c2 = report.claimReviews.find((claim) => claim.claimId === "C2");
assert.ok(c2.missingCitations, "safety claim should be marked citation-missing");

const markdown = renderMarkdownReview(report);
assert.ok(markdown.includes("Citation Grounding Review"));
assert.ok(markdown.includes("revise-before-submission"));
assert.ok(markdown.includes(report.summary.auditDigest));

console.log("citation-claim-grounding-assistant tests passed");
