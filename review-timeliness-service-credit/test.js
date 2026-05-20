"use strict";

const assert = require("assert");
const { createServiceCreditPacket, scoreReviewer, scoreSingleReview, daysBetween } = require("./index");
const { reviewLedger } = require("./sample-data");

function runTests() {
  assert.strictEqual(daysBetween("2026-03-08T09:00:00Z", "2026-03-09T09:00:00Z"), 1);

  const onTimeReview = scoreSingleReview(reviewLedger.reviewers[0].reviews[0]);
  assert(onTimeReview.serviceCredit > 85, "on-time actionable review should earn high service credit");
  assert.deepStrictEqual(onTimeReview.holds, [], "clean on-time review should not create holds");

  const lateReviewer = scoreReviewer(reviewLedger.reviewers[1]);
  assert(lateReviewer.holds.includes("major-overdue-without-extension"), "late review should create an overdue hold");
  assert(lateReviewer.holds.includes("blind-review-privacy-hold"), "privacy breach should hold reputation changes");
  assert.strictEqual(lateReviewer.serviceTier, "needs-service-review");

  const packet = createServiceCreditPacket(reviewLedger);
  assert.strictEqual(packet.reviewers.length, 2, "all reviewers should be scored");
  assert(packet.reviewerActions.length >= 3, "holds should be converted into moderator actions");
  assert(packet.transparencyReceipt.excludedSignals.includes("institution prestige"), "prestige should not affect service credit");
}

if (require.main === module) {
  runTests();
  console.log("review timeliness service-credit tests passed");
}

module.exports = { runTests };
