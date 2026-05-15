"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  analyzeResearchAssistantSuite,
  evaluateReproducibility,
  overlapScore,
  traceClaimsToProtocol,
} = require("./src/protocol-trace");

const samplePath = path.join(__dirname, "sample-data.json");
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

{
  const score = overlapScore(
    "CRISPR microglia biomarkers for Alzheimer's progression",
    "APOE microglia CRISPR biomarker progression"
  );
  assert.ok(score > 0.45, `expected meaningful overlap, got ${score}`);
}

{
  const traces = traceClaimsToProtocol(sample);
  assert.equal(traces.length, 3);
  assert.equal(traces[0].status, "aligned");
  assert.equal(traces[1].status, "aligned");
  assert.equal(traces[2].status, "unregistered");
  assert.equal(traces[2].matchedCommitmentId, null);
}

{
  const report = analyzeResearchAssistantSuite(sample);
  assert.equal(report.releaseDecision, "hold-for-revision");
  assert.ok(report.readinessScore >= 60 && report.readinessScore <= 85);
  assert.equal(report.reproducibility.confidenceBand, "strong");
  assert.ok(report.peerReview.recommendations.some((item) => item.topic === "Protocol drift"));
  assert.ok(report.researchGaps[0].topic.includes("CRISPR microglia"));
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);

  const changed = clone(sample);
  changed.manuscript.claims[0].text = "A changed biomarker claim should alter the audit digest";
  assert.notEqual(analyzeResearchAssistantSuite(changed).auditDigest, report.auditDigest);
}

{
  const weak = clone(sample);
  weak.reproducibility.rawDataAvailable = false;
  weak.reproducibility.expectedOutputs = [{ path: "results/out.csv" }];
  weak.reproducibility.attempts = [];
  const reproducibility = evaluateReproducibility(weak);
  assert.equal(reproducibility.confidenceBand, "weak");
  assert.ok(reproducibility.failed.includes("raw-data"));
  assert.ok(reproducibility.failed.includes("expected-output"));
  assert.ok(reproducibility.failed.includes("attempt-history"));
}

{
  const missing = clone(sample);
  delete missing.protocol;
  assert.throws(() => analyzeResearchAssistantSuite(missing), /missing required bundle field: protocol/);
}

console.log("research-assistant-protocol-trace tests passed");
