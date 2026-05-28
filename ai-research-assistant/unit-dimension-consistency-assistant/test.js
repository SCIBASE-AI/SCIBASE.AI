"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const packets = require("./data/manuscript-measurements.json");
const { reviewPacket, reviewMeasurements, summarizeReports } = require("./assistant");

test("marks a consistently normalized dose claim as reviewer-ready", () => {
  const report = reviewPacket(packets[0]);

  assert.equal(report.decision, "ready");
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.summary, { total: 0, high: 0, medium: 0, low: 0 });
});

test("holds claims that compare incompatible dimensions", () => {
  const report = reviewPacket(packets[1]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "hold");
  assert.ok(codes.includes("incompatible_dimensions"));
  assert.ok(codes.includes("unexpected_dimension"));
});

test("flags rate denominator and over-precision problems", () => {
  const report = reviewPacket(packets[2]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "hold");
  assert.ok(codes.includes("rate_denominator_mismatch"));
  assert.ok(codes.includes("derived_value_mismatch"));
  assert.ok(codes.includes("over_precise_derived_claim"));
});

test("requires normalization basis evidence before direct comparison", () => {
  const report = reviewPacket(packets[3]);
  const basisFinding = report.findings.find((item) => item.code === "missing_normalization_basis");

  assert.equal(report.decision, "hold");
  assert.equal(basisFinding.severity, "high");
});

test("summarizes manuscript readiness for reviewer packets", () => {
  const reports = reviewMeasurements(packets);
  const summary = summarizeReports(reports);

  assert.deepEqual(summary, {
    total: 4,
    ready: 1,
    hold: 3,
    highFindings: 5,
    mediumFindings: 1,
  });
});
