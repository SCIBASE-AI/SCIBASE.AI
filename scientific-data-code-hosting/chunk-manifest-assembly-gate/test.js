"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const manifests = require("./data/manifests.json");
const { reviewManifest, reviewManifests, summarizeReports } = require("./gate");

test("marks complete non-overlapping manifests as ready", () => {
  const report = reviewManifest(manifests[0]);

  assert.equal(report.decision, "ready");
  assert.deepEqual(report.findings, []);
  assert.equal(report.receipt.chunkCount, 3);
});

test("blocks manifests with byte-range gaps", () => {
  const report = reviewManifest(manifests[1]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("chunk_gap"));
});

test("blocks overlapping chunks", () => {
  const report = reviewManifest(manifests[2]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("chunk_overlap"));
});

test("blocks chunk digest mismatches", () => {
  const report = reviewManifest(manifests[3]);
  const codes = report.findings.map((item) => item.code);

  assert.equal(report.decision, "block");
  assert.ok(codes.includes("chunk_digest_mismatch"));
});

test("holds release when final artifact digest is missing", () => {
  const report = reviewManifest(manifests[4]);
  const finalDigestFinding = report.findings.find((item) => item.code === "missing_final_digest");

  assert.equal(report.decision, "ready");
  assert.equal(finalDigestFinding.severity, "hold");
});

test("summarizes chunk manifest readiness", () => {
  const reports = reviewManifests(manifests);
  const summary = summarizeReports(reports);

  assert.deepEqual(summary, {
    total: 5,
    ready: 2,
    blocked: 3,
    findings: 4,
  });
});
