"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const packets = require("./data/anchor-packets.json");
const { reviewAnchorPacket, reviewAnchorPackets, summarizeReports } = require("./gate");

test("marks stable anchors as ready", () => {
  const report = reviewAnchorPacket(packets[0]);

  assert.equal(report.decision, "ready");
  assert.deepEqual(report.findings, []);
  assert.equal(report.receipt.commentsReviewed, 1);
});

test("blocks comments whose original quote disappeared", () => {
  const report = reviewAnchorPacket(packets[1]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("missing_anchor_quote"));
});

test("blocks section drift and holds large unconfirmed movement", () => {
  const report = reviewAnchorPacket(packets[2]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("section_drift"));
  assert.ok(codes.includes("large_anchor_movement"));
});

test("blocks notebook output anchors after execution record changes", () => {
  const report = reviewAnchorPacket(packets[3]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("stale_notebook_output_anchor"));
});

test("accepts large movement when reviewer confirmed the re-anchor", () => {
  const report = reviewAnchorPacket(packets[4]);

  assert.equal(report.decision, "ready");
  assert.deepEqual(report.findings, []);
});

test("summarizes anchor readiness", () => {
  const reports = reviewAnchorPackets(packets);
  const summary = summarizeReports(reports);

  assert.deepEqual(summary, {
    total: 5,
    ready: 2,
    blocked: 3,
    findings: 4,
  });
});
