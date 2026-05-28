const assert = require("assert");
const {
  auditEndorsementRing,
  digest,
  hoursBetween,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { auditPolicy, readyBatch, riskyBatch } = require("./sample-data");

const risky = auditEndorsementRing(riskyBatch, auditPolicy);
assert.strictEqual(risky.decision, "freeze-reputation-cluster");
assert.ok(risky.riskScore >= 90, "risky batch should produce a strong freeze score");
assert.ok(risky.findings.some((item) => item.code === "RECIPROCAL_ENDORSEMENT_WINDOW"));
assert.ok(risky.findings.some((item) => item.code === "ENDORSEMENT_BURST_PATTERN"));
assert.ok(risky.findings.some((item) => item.code === "SHARED_SIGNAL_ENDORSEMENT_CLUSTER"));
assert.ok(risky.findings.some((item) => item.code === "REVIEWER_OVERLAP_TOO_HIGH"));
assert.ok(risky.findings.some((item) => item.code === "ENDORSEMENT_EVIDENCE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "BADGE_CRITERIA_SNAPSHOT_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "REPUTATION_DELTA_OUTPACES_EVIDENCE"));

const repeat = auditEndorsementRing(riskyBatch, auditPolicy);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const ready = auditEndorsementRing(readyBatch, auditPolicy);
assert.strictEqual(ready.decision, "safe-to-apply-reputation");
assert.strictEqual(ready.findings.length, 0);

assert.strictEqual(hoursBetween("2026-05-28T01:00:00Z", "2026-05-28T03:30:00Z"), 2.5);
assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Endorsement Ring Audit"));
assert.ok(markdown.includes("Synthetic reputation events only"));
assert.ok(markdown.includes("freeze-reputation-cluster"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Endorsement Ring Audit"));

console.log("endorsement-ring-auditor tests passed");
