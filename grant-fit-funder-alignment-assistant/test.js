"use strict";

const assert = require("assert");
const {
  createReviewerPacket,
  scorePriorityCoverage,
  scoreBudgetFit,
  scoreEvidenceGrounding,
} = require("./index");
const { grantPacket } = require("./sample-data");

function runTests() {
  const priority = scorePriorityCoverage(grantPacket);
  assert(priority.covered.includes("open science"), "open science priority should be covered");
  assert(priority.covered.includes("low-resource settings"), "low-resource priority should be covered");
  assert(priority.missing.length <= 1, "sample packet should cover most funder priorities");

  const budget = scoreBudgetFit(grantPacket);
  assert.strictEqual(budget.total, 185000, "budget total should be deterministic");
  assert.strictEqual(budget.overLimit, false, "sample budget should fit the funder cap");
  assert.deepStrictEqual(budget.missingJustification, ["contingency"], "blank justifications should be flagged");

  const evidence = scoreEvidenceGrounding(grantPacket);
  assert.strictEqual(evidence.unsupported.length, 1, "unsupported impact claim should be blocked");
  assert.strictEqual(evidence.missingReferences.length, 0, "all provided evidence IDs should exist");

  const packet = createReviewerPacket(grantPacket);
  assert.strictEqual(packet.status, "needs-revision", "blockers should prevent review-ready status");
  assert(packet.weightedScore > 0.7 && packet.weightedScore < 0.95, "weighted score should reflect mixed readiness");
  assert(packet.actionItems.some((item) => item.includes("unsupported claims")), "action items should include evidence grounding");
  assert(packet.reviewerSummary.length >= 4, "reviewer summary should be populated");
}

if (require.main === module) {
  runTests();
  console.log("grant-fit funder alignment tests passed");
}

module.exports = { runTests };
