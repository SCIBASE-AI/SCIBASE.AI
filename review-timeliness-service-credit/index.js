"use strict";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(startIso, endIso) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error(`Invalid review timestamp: ${startIso} -> ${endIso}`);
  }
  return (end - start) / MS_PER_DAY;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scoreSingleReview(review) {
  const latenessDays = Math.max(0, daysBetween(review.dueAt, review.submittedAt));
  const earlyDays = Math.max(0, daysBetween(review.submittedAt, review.dueAt));
  const actionableRatio = review.commentCount === 0 ? 0 : review.actionableComments / review.commentCount;
  const evidenceRatio = Math.min(1, review.evidenceLinks / Math.max(1, review.commentCount / 4));
  const extensionGrace = review.extensionApproved ? 0.55 : 0;
  const timelinessScore = clamp(1 + earlyDays * 0.025 - latenessDays * (0.12 - extensionGrace * 0.07), 0, 1);
  const usefulnessScore = clamp(actionableRatio * 0.72 + evidenceRatio * 0.28, 0, 1);
  const privacyScore = review.privacyBreach ? 0 : 1;
  const serviceCredit = clamp(timelinessScore * 58 + usefulnessScore * 32 + privacyScore * 10, 0, 100);

  return {
    reviewId: review.reviewId,
    latenessDays: Number(latenessDays.toFixed(2)),
    timelinessScore: Number(timelinessScore.toFixed(3)),
    usefulnessScore: Number(usefulnessScore.toFixed(3)),
    privacyScore,
    serviceCredit: Number(serviceCredit.toFixed(1)),
    holds: [
      latenessDays > 7 && !review.extensionApproved ? "major-overdue-without-extension" : "",
      actionableRatio < 0.5 ? "low-actionable-comment-density" : "",
      review.evidenceLinks === 0 ? "missing-review-evidence-links" : "",
      review.privacyBreach ? "blind-review-privacy-hold" : "",
    ].filter(Boolean),
  };
}

function scoreReviewer(reviewer) {
  const reviewScores = reviewer.reviews.map(scoreSingleReview);
  const averageCredit = reviewScores.reduce((sum, review) => sum + review.serviceCredit, 0) / reviewScores.length;
  const holds = [...new Set(reviewScores.flatMap((review) => review.holds))];
  const serviceTier = averageCredit >= 85 && holds.length === 0
    ? "trusted-fast-reviewer"
    : averageCredit >= 70 && !holds.includes("blind-review-privacy-hold")
      ? "steady-reviewer"
      : "needs-service-review";

  return {
    reviewerId: reviewer.reviewerId,
    displayName: reviewer.displayName,
    institution: reviewer.institution,
    averageCredit: Number(averageCredit.toFixed(1)),
    serviceTier,
    holds,
    reviewScores,
  };
}

function createServiceCreditPacket(ledger) {
  const reviewers = ledger.reviewers.map(scoreReviewer);
  const leaderboardReady = reviewers.filter((reviewer) => reviewer.holds.length === 0);
  const reviewerActions = reviewers.flatMap((reviewer) => reviewer.holds.map((hold) => ({
    reviewerId: reviewer.reviewerId,
    hold,
    action: actionForHold(hold),
  })));

  return {
    projectId: ledger.projectId,
    privacyMode: ledger.privacyMode,
    scoringWindowDays: ledger.scoringWindowDays,
    reviewers,
    leaderboardReady: leaderboardReady.map((reviewer) => reviewer.reviewerId),
    reviewerActions,
    transparencyReceipt: {
      includedSignals: [
        "due date adherence",
        "approved extension grace",
        "actionable comment density",
        "evidence link coverage",
        "blind-review privacy holds",
      ],
      excludedSignals: ["author identity", "institution prestige", "private reviewer notes"],
    },
  };
}

function actionForHold(hold) {
  const actions = {
    "major-overdue-without-extension": "Route to moderator before granting service-credit boost.",
    "low-actionable-comment-density": "Request clearer comments tied to manuscript sections or artifacts.",
    "missing-review-evidence-links": "Ask reviewer to attach evidence links for factual critiques.",
    "blind-review-privacy-hold": "Hold public reputation changes until privacy breach is reviewed.",
  };
  return actions[hold] || "Review hold manually.";
}

module.exports = {
  createServiceCreditPacket,
  scoreReviewer,
  scoreSingleReview,
  daysBetween,
};
