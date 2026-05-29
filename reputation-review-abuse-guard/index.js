const MIN_REVIEW_WORDS = 40;
const HIGH_REPUTATION_DELTA = 10;

function evaluateReview(review) {
  const findings = [];

  if (review.reviewerAffiliation === review.authorAffiliation) {
    findings.push("reviewer shares affiliation with target author");
  }
  if (review.commentWords < MIN_REVIEW_WORDS && review.scoreDelta >= HIGH_REPUTATION_DELTA) {
    findings.push("high reputation delta from low-effort review text");
  }
  if (review.reciprocalReviewIds.length > 0) {
    findings.push(`reciprocal review link detected: ${review.reciprocalReviewIds.join(", ")}`);
  }
  if (review.anonymousMode && review.leakedIdentityText) {
    findings.push("anonymous review contains identity leakage");
  }
  if (review.endorsementCluster.includes(review.reviewer) && review.endorsementCluster.includes(review.targetAuthor)) {
    findings.push("reviewer and target author appear in same endorsement cluster");
  }

  let decision = "count-reputation-credit";
  if (findings.some((finding) => finding.includes("identity leakage"))) {
    decision = "redact-before-credit";
  }
  if (findings.length >= 2) {
    decision = "hold-reputation-credit";
  }

  const actions = {
    "count-reputation-credit": ["apply reputation credit", "record review audit"],
    "redact-before-credit": ["redact identity leakage", "queue moderator check before credit"],
    "hold-reputation-credit": ["hold reputation credit", "route to trust-and-safety review", "suppress leaderboard update"]
  }[decision];

  return {
    id: review.id,
    reviewer: review.reviewer,
    targetProject: review.targetProject,
    decision,
    scoreDelta: review.scoreDelta,
    findings,
    actions
  };
}

function evaluateBatch(batch) {
  const reviews = batch.reviews.map(evaluateReview);
  const summary = reviews.reduce(
    (acc, review) => {
      acc.total += 1;
      acc[review.decision] = (acc[review.decision] || 0) + 1;
      acc.findingCount += review.findings.length;
      return acc;
    },
    { total: 0, findingCount: 0 }
  );

  return {
    batchId: batch.id,
    generatedAt: batch.generatedAt,
    summary,
    reviews
  };
}

module.exports = { MIN_REVIEW_WORDS, HIGH_REPUTATION_DELTA, evaluateReview, evaluateBatch };
