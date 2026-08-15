"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzeSplitReleasePackets, missingRequiredSplits, pairwiseOverlaps, classBalanceDrift } = require("../src");
const samples = require("../data/sample_split_release_packets.json");

test("detects missing required split manifests", () => {
  const missing = missingRequiredSplits(samples.find((item) => item.id === "split-hold-004"));
  assert.deepEqual(missing, ["test"]);
});

test("detects record and group overlap across splits", () => {
  const packet = samples.find((item) => item.id === "split-hold-002");
  assert.equal(pairwiseOverlaps(packet, "recordIds").length, 1);
  assert.equal(pairwiseOverlaps(packet, "groupIds").length, 1);
});

test("detects stratification balance drift", () => {
  const drift = classBalanceDrift(samples.find((item) => item.id === "split-review-003"));
  assert.ok(drift.length >= 2);
});

test("releases a clean split package", () => {
  const result = analyzePacket(samples.find((item) => item.id === "split-release-001"));
  assert.equal(result.decision, "RELEASE");
  assert.equal(result.findings.length, 0);
});

test("holds split packages with leakage and embargoed rows", () => {
  const result = analyzePacket(samples.find((item) => item.id === "split-hold-002"));
  assert.equal(result.decision, "HOLD_RELEASE");
  assert.ok(result.findings.some((item) => item.code === "TRAIN_VALIDATION_TEST_RECORD_OVERLAP"));
  assert.ok(result.findings.some((item) => item.code === "GROUP_LEAKAGE_ACROSS_SPLITS"));
  assert.ok(result.findings.some((item) => item.code === "EMBARGOED_RECORD_IN_PUBLIC_SPLIT"));
  assert.ok(result.findings.some((item) => item.code === "PUBLIC_RELEASE_NOT_FROZEN_FOR_SPLIT_RISK"));
});

test("routes provenance and balance issues for review", () => {
  const result = analyzePacket(samples.find((item) => item.id === "split-review-003"));
  assert.equal(result.decision, "REVIEW_RELEASE");
  assert.ok(result.findings.some((item) => item.code === "SPLIT_PROVENANCE_INCOMPLETE"));
  assert.ok(result.findings.some((item) => item.code === "STRATIFICATION_BALANCE_DRIFT"));
});

test("holds missing test split before public release", () => {
  const result = analyzePacket(samples.find((item) => item.id === "split-hold-004"));
  assert.equal(result.decision, "HOLD_RELEASE");
  assert.ok(result.findings.some((item) => item.code === "REQUIRED_SPLIT_MISSING"));
});

test("aggregates split release decisions", () => {
  const report = analyzeSplitReleasePackets(samples);
  assert.equal(report.totalPackets, 4);
  assert.deepEqual(report.counts, { RELEASE: 1, REVIEW_RELEASE: 1, HOLD_RELEASE: 2 });
});
