"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzePackets, includesCausalLanguage } = require("../src");

test("detects causal language in common manuscript wording", () => {
  assert.equal(includesCausalLanguage("The intervention reduces risk."), true);
  assert.equal(includesCausalLanguage("The marker is associated with risk."), false);
});

test("holds causal claims from cross-sectional evidence without comparator or temporal order", () => {
  const review = analyzePacket({
    id: "bad-causal",
    title: "App usage improves outcomes",
    claim: {
      intent: "causal",
      text: "The app improves outcomes."
    },
    evidence: {
      design: "cross_sectional",
      hasComparator: false,
      temporalOrder: false,
      effectSize: "0.4 SD"
    },
    conclusion: "The app causes better outcomes."
  });

  assert.equal(review.decision, "HOLD");
  assert.ok(review.findings.some((item) => item.code === "DESIGN_CANNOT_SUPPORT_CAUSAL_LANGUAGE"));
  assert.ok(review.findings.some((item) => item.code === "MISSING_COMPARATOR"));
  assert.ok(review.findings.some((item) => item.code === "TEMPORAL_ORDER_GAP"));
});

test("releases supported randomized causal claims", () => {
  const review = analyzePacket({
    id: "good-rct",
    title: "Coaching reduces blood pressure",
    domain: "clinical trials",
    claim: {
      intent: "causal",
      text: "Coaching reduces blood pressure."
    },
    evidence: {
      design: "randomized_controlled_trial",
      hasComparator: true,
      temporalOrder: true,
      confounderStrategy: "blocked randomization",
      effectSize: "-7 mmHg",
      confidenceInterval: "95% CI -10 to -4"
    },
    conclusion: "Coaching reduces blood pressure in this randomized trial."
  });

  assert.equal(review.decision, "RELEASE");
  assert.equal(review.findingCount, 0);
});

test("summarizes packet decisions deterministically", () => {
  const report = analyzePackets([
    {
      id: "a",
      title: "A",
      claim: { intent: "associational", text: "A is associated with B." },
      evidence: { design: "cross_sectional" },
      conclusion: "A is associated with B."
    },
    {
      id: "b",
      title: "B",
      claim: { intent: "causal", text: "A prevents B." },
      evidence: { design: "case_series", hasComparator: false, temporalOrder: false },
      conclusion: "A prevents B."
    }
  ]);

  assert.equal(report.packetCount, 2);
  assert.equal(report.decisionCounts.RELEASE, 1);
  assert.equal(report.decisionCounts.HOLD, 1);
});
