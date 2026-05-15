const crypto = require("node:crypto");

function buildCalibrationBench(input) {
  const validation = validateCalibrationInput(input);
  const projectIndex = new Map((input.projects || []).map((project) => [project.id, project]));
  const reviewerGroups = groupReviewsByReviewer(input.reviews || []);
  const reviewerReports = Array.from(reviewerGroups.entries()).map(([reviewerId, reviews]) =>
    evaluateReviewer(reviewerId, reviews, projectIndex, input.rubric || {}, input.contributors || [])
  );
  const leaderboard = buildLeaderboard(reviewerReports);
  const coachingQueue = buildCoachingQueue(reviewerReports);
  const trustAdjustments = buildTrustAdjustments(reviewerReports, input.rubric || {});
  const dashboard = buildDashboard(input, reviewerReports, coachingQueue, trustAdjustments);

  const report = {
    programId: input.programId,
    asOf: input.asOf,
    validation,
    reviewerReports,
    leaderboard,
    coachingQueue,
    trustAdjustments,
    dashboard,
    auditTrail: buildAuditTrail(input, reviewerReports, coachingQueue, trustAdjustments)
  };

  report.digest = stableDigest(report);
  return report;
}

function validateCalibrationInput(input) {
  const required = [
    ["programId", input.programId],
    ["rubric.criteria", input.rubric && (input.rubric.criteria || []).length],
    ["projects", (input.projects || []).length],
    ["reviews", (input.reviews || []).length]
  ];
  const missing = required.filter(([, value]) => !value).map(([field]) => field);
  const reviewIssues = (input.reviews || []).flatMap((review) => {
    const issues = [];
    if (!review.id) issues.push("review.id");
    if (!review.reviewerId) issues.push(      `${review.id || "unknown"}.reviewerId`
    );
    if (!review.projectId) issues.push(`${review.id || "unknown"}.projectId`);
    if (!review.scores) issues.push(`${review.id || "unknown"}.scores`);
    return issues;
  });

  return {
    status: missing.length === 0 && reviewIssues.length === 0 ? "passed" : "incomplete",
    score: Math.max(0, 100 - missing.length * 15 - reviewIssues.length * 5),
    missing,
    reviewIssues
  };
}

function evaluateReviewer(reviewerId, reviews, projectIndex, rubric, contributors) {
  const criteria = rubric.criteria || [];
  const deltas = reviews.flatMap((review) => {
    const project = projectIndex.get(review.projectId);
    if (!project) return [];
    return criteria.map((criterion) => ({
      reviewId: review.id,
      projectId: review.projectId,
      criterion,
      score: Number(review.scores[criterion] || 0),
      consensus: Number(project.consensus[criterion] || 0),
      delta: Number(review.scores[criterion] || 0) - Number(project.consensus[criterion] || 0)
    }));
  });
  const byCriterion = criteria.map((criterion) => {
    const criterionDeltas = deltas.filter((item) => item.criterion === criterion);
    const averageDelta = average(criterionDeltas.map((item) => item.delta));
    const meanAbsoluteError = average(criterionDeltas.map((item) => Math.abs(item.delta)));
    return {
      criterion,
      averageDelta: round(averageDelta),
      meanAbsoluteError: round(meanAbsoluteError),
      drift: classifyDrift(averageDelta, meanAbsoluteError)
    };
  });
  const weightedError = weightedMean(byCriterion, rubric.weights || {});
  const calibrationScore = round(Math.max(0, 1 - weightedError / 4));
  const reproducibilityBlindSpot = byCriterion.find((item) => item.criterion === "reproducibility" && item.averageDelta > 0.75);
  const contributor = contributors.find((item) => item.reviewerId === reviewerId) || {};
  const reputationSignal = buildReputationSignal(calibrationScore, contributor, reproducibilityBlindSpot);

  return {
    reviewerId,
    reviewCount: reviews.length,
    modes: Array.from(new Set(reviews.map((review) => review.mode))),
    byCriterion,
    weightedError: round(weightedError),
    calibrationScore,
    reproducibilityBlindSpot: Boolean(reproducibilityBlindSpot),
    reputationSignal,
    coachingActions: buildReviewerCoachingActions(reviewerId, byCriterion, calibrationScore, reproducibilityBlindSpot)
  };
}

function buildReputationSignal(calibrationScore, contributor, reproducibilityBlindSpot) {
  const contributionBonus = Math.min(0.12, (contributor.completedBounties || 0) * 0.02 + (contributor.endorsements || 0) * 0.005);
  const blindSpotPenalty = reproducibilityBlindSpot ? 0.08 : 0;
  const calibratedScore = round(Math.max(0, Math.min(1, calibrationScore + contributionBonus - blindSpotPenalty)));
  return {
    calibratedScore,
    contributionBonus: round(contributionBonus),
    blindSpotPenalty,
    roles: contributor.roles || [],
    tier: chooseTier(calibratedScore)
  };
}

function buildReviewerCoachingActions(reviewerId, byCriterion, calibrationScore, reproducibilityBlindSpot) {
  const actions = [];
  for (const item of byCriterion) {
    if (item.drift === "lenient") {
      actions.push({
        reviewerId,
        type: "leniency-calibration",
        criterion: item.criterion,
        message: `Review practice set: ${item.criterion} scores are higher than consensus.`
      });
    }
    if (item.drift === "severe") {
      actions.push({
        reviewerId,
        type: "severity-calibration",
        criterion: item.criterion,
        message: `Review practice set: ${item.criterion} scores are lower than consensus.`
      });
    }
  }
  if (reproducibilityBlindSpot) {
    actions.push({
      reviewerId,
      type: "reproducibility-blind-spot",
      criterion: "reproducibility",
      message: "Add reproducibility evidence checklist before assigning Trusted Reviewer status."
    });
  }
  if (calibrationScore < 0.7) {
    actions.push({
      reviewerId,
      type: "mentor-review",
      criterion: "overall",
      message: "Pair with a calibrated reviewer for the next structured peer review."
    });
  }
  return actions;
}

function buildLeaderboard(reviewerReports) {
  return reviewerReports
    .map((report) => ({
      reviewerId: report.reviewerId,
      calibrationScore: report.calibrationScore,
      trustScore: report.reputationSignal.calibratedScore,
      tier: report.reputationSignal.tier,
      reviewCount: report.reviewCount
    }))
    .sort((a, b) => b.trustScore - a.trustScore || b.calibrationScore - a.calibrationScore);
}

function buildCoachingQueue(reviewerReports) {
  return reviewerReports.flatMap((report) => report.coachingActions);
}

function buildTrustAdjustments(reviewerReports, rubric) {
  const threshold = Number(rubric.calibrationThreshold || 0.65);
  return reviewerReports.map((report) => ({
    reviewerId: report.reviewerId,
    status: report.calibrationScore >= threshold ? "eligible" : "quarantine-until-coached",
    calibrationScore: report.calibrationScore,
    trustScore: report.reputationSignal.calibratedScore,
    tier: report.reputationSignal.tier,
    reason: report.calibrationScore >= threshold
      ? "Structured review scores are close enough to consensus for reputation credit."
      : "Review scores require calibration before they increase public reputation."
  }));
}

function buildDashboard(input, reviewerReports, coachingQueue, trustAdjustments) {
  const quarantined = trustAdjustments.filter((item) => item.status === "quarantine-until-coached");
  return {
    title: `Review calibration ${input.programId}`,
    status: coachingQueue.length === 0 ? "ready-for-reputation-credit" : "coaching-needed",
    reviewerCount: reviewerReports.length,
    coachingActionCount: coachingQueue.length,
    quarantinedReviewerCount: quarantined.length,
    topAction: coachingQueue[0] ? coachingQueue[0].message : "Publish calibrated reputation scores."
  };
}

function buildAuditTrail(input, reviewerReports, coachingQueue, trustAdjustments) {
  return [
    {
      type: "calibration-built",
      programId: input.programId,
      reviewerCount: reviewerReports.length,
      coachingActionCount: coachingQueue.length
    },
    ...reviewerReports.map((report) => ({
      type: "reviewer-scored",
      reviewerId: report.reviewerId,
      calibrationScore: report.calibrationScore,
      tier: report.reputationSignal.tier
    })),
    ...trustAdjustments.map((adjustment) => ({
      type: "trust-adjustment",
      reviewerId: adjustment.reviewerId,
      status: adjustment.status,
      trustScore: adjustment.trustScore
    }))
  ];
}

function groupReviewsByReviewer(reviews) {
  const groups = new Map();
  for (const review of reviews) {
    const current = groups.get(review.reviewerId) || [];
    current.push(review);
    groups.set(review.reviewerId, current);
  }
  return groups;
}

function weightedMean(byCriterion, weights) {
  const totalWeight = byCriterion.reduce((sum, item) => sum + Number(weights[item.criterion] || 1), 0);
  return byCriterion.reduce((sum, item) => sum + item.meanAbsoluteError * Number(weights[item.criterion] || 1), 0) / totalWeight;
}

function classifyDrift(averageDelta, meanAbsoluteError) {
  if (averageDelta >= 0.75 && meanAbsoluteError >= 0.75) return "lenient";
  if (averageDelta <= -0.75 && meanAbsoluteError >= 0.75) return "severe";
  if (meanAbsoluteError >= 1.25) return "inconsistent";
  return "calibrated";
}

function chooseTier(score) {
  if (score >= 0.88) return "trusted-reviewer";
  if (score >= 0.75) return "calibrated-reviewer";
  if (score >= 0.6) return "needs-light-coaching";
  return "mentor-required";
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")} }`.replace(' }', '}');
  }
  return JSON.stringify(value);
}

module.exports = {
  buildCalibrationBench,
  validateCalibrationInput,
  evaluateReviewer,
  classifyDrift,
  stableDigest
};
