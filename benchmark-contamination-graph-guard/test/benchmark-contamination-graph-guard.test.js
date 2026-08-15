"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzeBenchmarkPackets, splitOverlap, labelSourceOverlap, daysBetween } = require("../src");
const samples = require("../data/sample_benchmark_graph_packets.json");

test("computes date offsets for graph evidence", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-10"), 9);
  assert.equal(daysBetween("bad", "2026-01-10"), null);
});

test("detects split hash overlap", () => {
  const overlap = splitOverlap({
    splitEvidence: {
      trainingHashes: ["A", "B", "C"],
      evaluationHashes: ["c", "D"]
    }
  });
  assert.deepEqual(overlap, ["c"]);
});

test("detects label source leakage", () => {
  const overlap = labelSourceOverlap({
    splitEvidence: {
      trainingLabelSources: ["source-one", "source-two"],
      benchmarkLabelSources: ["source-two"]
    }
  });
  assert.deepEqual(overlap, ["source-two"]);
});

test("publishes clean benchmark graph packets", () => {
  const result = analyzePacket(samples.find((item) => item.id === "benchmark-publish-001"));
  assert.equal(result.decision, "PUBLISH");
  assert.equal(result.findings.length, 0);
});

test("holds direct benchmark training contamination", () => {
  const result = analyzePacket(samples.find((item) => item.id === "benchmark-hold-002"));
  assert.equal(result.decision, "HOLD");
  assert.ok(result.findings.some((item) => item.code === "DIRECT_TRAINING_BENCHMARK_OVERLAP"));
  assert.ok(result.findings.some((item) => item.code === "TRAIN_EVAL_SPLIT_HASH_COLLISION"));
  assert.ok(result.findings.some((item) => item.code === "LABEL_SOURCE_LEAKAGE"));
  assert.ok(result.findings.some((item) => item.code === "UNSAFE_RECOMMENDATION_PATH_NOT_FROZEN"));
});

test("routes older benchmarks with missing holdout evidence for review", () => {
  const result = analyzePacket(samples.find((item) => item.id === "benchmark-review-003"));
  assert.equal(result.decision, "REVIEW");
  assert.ok(result.findings.some((item) => item.code === "BENCHMARK_PREDATES_TRAINING_CUTOFF"));
  assert.ok(result.findings.some((item) => item.code === "INDEPENDENT_HOLDOUT_EVIDENCE_MISSING"));
});

test("holds label leakage even without direct benchmark training edge", () => {
  const result = analyzePacket(samples.find((item) => item.id === "benchmark-hold-004"));
  assert.equal(result.decision, "HOLD");
  assert.ok(result.findings.some((item) => item.code === "LABEL_SOURCE_LEAKAGE"));
});

test("aggregates benchmark packet decisions", () => {
  const report = analyzeBenchmarkPackets(samples);
  assert.equal(report.totalPackets, 4);
  assert.deepEqual(report.counts, { PUBLISH: 1, REVIEW: 1, HOLD: 2 });
});
