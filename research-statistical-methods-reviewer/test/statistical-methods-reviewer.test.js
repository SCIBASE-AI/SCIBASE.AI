"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  assessMultiplicity,
  assessPower,
  assessReproducibility,
  assessTestChoice,
  digest,
  evaluateReviewDocket,
  signReviewPacket,
  stableStringify
} = require("../src/statistical-methods-reviewer");

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "sample-review-docket.json"), "utf8"));

test("summarizes statistical review outcomes across manuscripts", () => {
  const result = evaluateReviewDocket(sample);

  assert.equal(result.summary.total, 3);
  assert.equal(result.summary.ready, 1);
  assert.equal(result.summary.needs_review, 1);
  assert.equal(result.summary.blocked, 1);
  assert.ok(result.summary.blockers >= 5);
  assert.ok(result.summary.reviews >= 7);
  assert.equal(result.signedReviewPackets.length, 3);
});

test("keeps a fully evidenced preregistered analysis ready", () => {
  const result = evaluateReviewDocket(sample);
  const climate = result.manuscripts.find((manuscript) => manuscript.manuscriptId === "ms-climate-replication");

  assert.equal(climate.reviewStatus, "ready");
  assert.equal(climate.actionCounts.blocker, 0);
  assert.equal(climate.actionCounts.review, 0);
  assert.equal(climate.claimCoverage[0].evidenceReady, true);
  assert.equal(climate.reviewerPacket.recommendation, "ready_for_editorial_review");
});

test("flags statistical validity and selective reporting risks", () => {
  const result = evaluateReviewDocket(sample);
  const microbiome = result.manuscripts.find((manuscript) => manuscript.manuscriptId === "ms-microbiome-signature");

  assert.equal(microbiome.reviewStatus, "blocked");
  assert.ok(microbiome.findings.some((finding) => finding.scope === "test-choice" && finding.severity === "blocker"));
  assert.ok(microbiome.findings.some((finding) => finding.scope === "multiple-comparisons"));
  assert.ok(microbiome.findings.some((finding) => finding.scope === "selective-reporting"));
  assert.ok(microbiome.findings.some((finding) => finding.scope === "claim-analysis-map"));
});

test("detects low but nonblocking power in exploratory analysis", () => {
  const result = evaluateReviewDocket(sample);
  const neuro = result.manuscripts.find((manuscript) => manuscript.manuscriptId === "ms-neuro-stim-response");

  assert.equal(neuro.reviewStatus, "needs_review");
  assert.equal(neuro.actionCounts.blocker, 0);
  assert.ok(neuro.findings.some((finding) => finding.scope === "power" && finding.target === "age-adjusted-model"));
});

test("individual assessors produce focused findings", () => {
  const repeatedBad = {
    analysisId: "bad-repeat",
    test: "t_test",
    outcomeType: "continuous",
    dataDesign: "repeated_measures",
    groups: 3,
    sampleSize: 22,
    comparisons: 12,
    correction: "none",
    power: 0.5,
    reproducibilityEvidence: ["script"]
  };

  assert.ok(assessTestChoice(repeatedBad).some((finding) => finding.severity === "blocker"));
  assert.ok(assessPower(repeatedBad).filter((finding) => finding.severity === "blocker").length >= 2);
  assert.equal(assessMultiplicity(repeatedBad)[0].severity, "blocker");
  assert.ok(assessReproducibility(repeatedBad).some((finding) => finding.message.includes("raw-data")));
});

test("signs review packets deterministically", () => {
  const payload = {
    type: "research_assistant.statistical_review.evaluated",
    manuscriptId: "ms-climate-replication",
    reviewStatus: "ready"
  };
  const first = signReviewPacket(payload, "test-secret");
  const second = signReviewPacket(
    {
      reviewStatus: "ready",
      manuscriptId: "ms-climate-replication",
      type: "research_assistant.statistical_review.evaluated"
    },
    "test-secret"
  );

  assert.equal(first.digest, second.digest);
  assert.equal(first.signature, second.signature);
  assert.equal(digest(payload).length, 64);
  assert.equal(stableStringify({ b: 2, a: 1 }), "{\"a\":1,\"b\":2}");
});
