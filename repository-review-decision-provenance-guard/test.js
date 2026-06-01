"use strict";

const assert = require("node:assert/strict");
const {
  evaluateReviewDecisionProvenance,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateReviewDecisionProvenance(cleanPacket, { now: "2026-06-01T10:35:00.000Z" });
assert.equal(clean.status, "READY");
assert.equal(clean.findings.length, 0);
assert.equal(clean.decisionRecords.length, 5);
assert.deepEqual(clean.coverage.missingComponents, []);
assert.equal(clean.manifestPatch.reviewDecisionPacket.decisionRecordCount, 5);

const risky = evaluateReviewDecisionProvenance(riskyPacket, { now: "2026-06-01T10:35:00.000Z" });
assert.equal(risky.status, "HOLD");
assert.ok(risky.findings.some((finding) => finding.code === "PRIVATE_REVIEW_NOTE_EXPORTED"));
assert.ok(risky.findings.some((finding) => finding.code === "THREAD_NOT_RESOLVED_FOR_EXPORT"));
assert.ok(risky.findings.some((finding) => finding.code === "REVIEW_DECISION_PACKET_NOT_LINKED"));
assert.ok(risky.findings.some((finding) => finding.code === "REVIEWER_ROLE_NOT_ELIGIBLE_FOR_COMPONENT"));
assert.ok(risky.releaseReadiness.privateLeakRecords.includes("T-private-note"));

const markdown = renderMarkdownReport(risky, riskyPacket);
assert.match(markdown, /Repository Review-Decision Provenance Guard/);
assert.match(markdown, /PRIVATE_REVIEW_NOTE_EXPORTED/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Review-decision provenance/);

assert.throws(() => evaluateReviewDecisionProvenance(null), /expects a packet object/);

console.log("repository-review-decision-provenance-guard tests passed");
