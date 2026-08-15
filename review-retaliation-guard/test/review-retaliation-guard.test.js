"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzeReputationPackets, daysBetween, isCriticalReview } = require("../src");
const samples = require("../data/sample_reputation_events.json");

test("detects critical review signals", () => {
  assert.equal(isCriticalReview({ recommendation: "reject", rating: 5 }), true);
  assert.equal(isCriticalReview({ recommendation: "accept", rating: 1 }), true);
  assert.equal(isCriticalReview({ recommendation: "accept", rating: 5 }), false);
});

test("computes days between review and reputation event", () => {
  assert.equal(daysBetween("2026-08-01", "2026-08-04"), 3);
  assert.equal(daysBetween("not-a-date", "2026-08-04"), null);
});

test("holds affiliated punitive actions after a critical review", () => {
  const result = analyzePacket(samples.find((item) => item.id === "rep-hold-002"));
  assert.equal(result.decision, "HOLD");
  assert.equal(result.suspiciousEventCount, 2);
  assert.ok(result.findings.some((item) => item.code === "AFFILIATED_PUNITIVE_ACTION_AFTER_CRITICAL_REVIEW"));
  assert.ok(result.findings.some((item) => item.code === "RECIPROCAL_OR_CLUSTERED_RETALIATION_BURST"));
  assert.ok(result.findings.some((item) => item.code === "PUBLIC_REPUTATION_EXPORT_NOT_FROZEN"));
});

test("detects coercive language in a reputation event", () => {
  const result = analyzePacket(samples.find((item) => item.id === "rep-hold-003"));
  assert.equal(result.decision, "HOLD");
  assert.ok(result.findings.some((item) => item.code === "COERCIVE_REVIEW_REVISION_SIGNAL"));
});

test("does not flag independent freezes or unrelated old moderation", () => {
  assert.equal(analyzePacket(samples.find((item) => item.id === "rep-clear-001")).decision, "CLEAR");
  assert.equal(analyzePacket(samples.find((item) => item.id === "rep-clear-004")).decision, "CLEAR");
});

test("aggregates packet decisions for reviewer-facing reports", () => {
  const report = analyzeReputationPackets(samples);
  assert.equal(report.totalPackets, 4);
  assert.deepEqual(report.counts, { CLEAR: 2, REVIEW: 0, HOLD: 2 });
});
