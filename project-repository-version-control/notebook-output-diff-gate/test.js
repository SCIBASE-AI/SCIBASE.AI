"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const packets = require("./data/notebook-diffs.json");
const { reviewNotebookDiff, reviewNotebookDiffs, summarizeReports } = require("./gate");

test("marks a code and output diff with execution evidence as ready", () => {
  const report = reviewNotebookDiff(packets[0]);

  assert.equal(report.decision, "ready");
  assert.deepEqual(report.findings, []);
  assert.equal(report.receipt.changedCells, 1);
  assert.deepEqual(report.receipt.executionRecords, ["run-2026-05-28-a"]);
});

test("blocks stale output changes without code changes or execution records", () => {
  const report = reviewNotebookDiff(packets[1]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("stale_output_change"));
  assert.ok(codes.includes("large_output_without_evidence"));
});

test("blocks executable changes that lack run and environment evidence", () => {
  const report = reviewNotebookDiff(packets[2]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("missing_execution_record"));
  assert.ok(codes.includes("missing_environment_fingerprint"));
});

test("holds noisy output diffs whose digests did not change", () => {
  const report = reviewNotebookDiff(packets[3]);
  const digestFinding = report.findings.find((item) => item.code === "unchanged_output_digest");

  assert.equal(report.decision, "ready");
  assert.equal(digestFinding.severity, "hold");
});

test("summarizes notebook diff readiness", () => {
  const reports = reviewNotebookDiffs(packets);
  const summary = summarizeReports(reports);

  assert.deepEqual(summary, {
    total: 4,
    ready: 2,
    blocked: 2,
    findings: 5,
  });
});
