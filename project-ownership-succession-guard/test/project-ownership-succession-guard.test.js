"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzeSuccessionPackets, daysBetween, hasOwnerSuccessionTrigger } = require("../src");
const samples = require("../data/sample_succession_packets.json");

test("computes inactivity windows", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-15"), 14);
  assert.equal(daysBetween("bad-date", "2026-01-15"), null);
});

test("detects owner succession triggers", () => {
  assert.equal(hasOwnerSuccessionTrigger({ currentOwner: { active: false }, request: {} }), true);
  assert.equal(hasOwnerSuccessionTrigger({ currentOwner: { active: true, lastSeenAt: "2026-01-01" }, reviewDate: "2026-08-15", request: { inactivityThresholdDays: 90 } }), true);
  assert.equal(hasOwnerSuccessionTrigger({ currentOwner: { active: true, lastSeenAt: "2026-08-01" }, reviewDate: "2026-08-15", request: { reason: "team_preference" } }), false);
});

test("approves a complete succession packet", () => {
  const result = analyzePacket(samples.find((item) => item.id === "succession-approve-001"));
  assert.equal(result.decision, "APPROVE");
  assert.equal(result.findings.length, 0);
});

test("holds invalid takeover attempts", () => {
  const result = analyzePacket(samples.find((item) => item.id === "succession-hold-002"));
  assert.equal(result.decision, "HOLD");
  assert.ok(result.findings.some((item) => item.code === "NO_VALID_SUCCESSION_TRIGGER"));
  assert.ok(result.findings.some((item) => item.code === "PROPOSED_OWNER_ROLE_INELIGIBLE"));
  assert.ok(result.findings.some((item) => item.code === "COMPETING_OWNERSHIP_CLAIM_UNRESOLVED"));
});

test("holds regulated project transfers without compliance signoff", () => {
  const result = analyzePacket(samples.find((item) => item.id === "succession-hold-003"));
  assert.equal(result.decision, "HOLD");
  assert.equal(result.complianceHold, true);
  assert.ok(result.findings.some((item) => item.code === "COMPLIANCE_HOLD_TRANSFER_APPROVAL_MISSING"));
});

test("routes incomplete but non-critical packets for review", () => {
  const result = analyzePacket(samples.find((item) => item.id === "succession-review-004"));
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.findings.some((item) => item.code === "OBJECTION_WINDOW_TOO_SHORT"));
  assert.ok(result.findings.some((item) => item.code === "IMMUTABLE_TRANSFER_AUDIT_RECEIPT_MISSING"));
});

test("aggregates transfer packet decisions", () => {
  const report = analyzeSuccessionPackets(samples);
  assert.equal(report.totalPackets, 4);
  assert.deepEqual(report.counts, { APPROVE: 1, REVIEW: 1, HOLD: 2 });
});
