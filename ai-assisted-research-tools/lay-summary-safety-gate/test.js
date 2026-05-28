"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const packets = require("./data/summary-packets.json");
const { reviewSummaryPacket, reviewSummaryPackets, summarizeReports } = require("./gate");

test("marks a scoped uncertain lay summary as ready", () => {
  const report = reviewSummaryPacket(packets[0]);

  assert.equal(report.decision, "ready");
  assert.deepEqual(report.findings, []);
  assert.equal(report.receipt.requiredTerms, 1);
});

test("blocks unsupported causal and benefit claims", () => {
  const report = reviewSummaryPacket(packets[1]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("unsupported_causal_language"));
  assert.ok(codes.includes("unsupported_benefit_language"));
  assert.ok(codes.includes("scope_broadening"));
});

test("blocks summaries that remove source uncertainty", () => {
  const report = reviewSummaryPacket(packets[2]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("missing_uncertainty"));
});

test("holds technical terms that lack plain-language explanation", () => {
  const report = reviewSummaryPacket(packets[3]);
  const termFinding = report.findings.find((item) => item.code === "unexplained_term");

  assert.equal(report.decision, "ready");
  assert.equal(termFinding.severity, "hold");
  assert.equal(termFinding.target, "cytokine");
});

test("summarizes lay summary readiness", () => {
  const reports = reviewSummaryPackets(packets);
  const summary = summarizeReports(reports);

  assert.deepEqual(summary, {
    total: 4,
    ready: 2,
    blocked: 2,
    findings: 5,
  });
});
