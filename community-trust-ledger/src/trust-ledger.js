const REVIEW_WEIGHTS = Object.freeze({
  clarity: 0.22,
  rigor: 0.32,
  novelty: 0.16,
  reproducibility: 0.3
});

const CREDIT_WEIGHTS = Object.freeze({
  conceptualization: 9,
  data_curation: 7,
  software: 8,
  validation: 8,
  peer_review: 6,
  supervision: 5,
  writing: 6
});

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function normalizeReview(review) {
  const weightedScore = Object.entries(REVIEW_WEIGHTS).reduce(
    (score, [dimension, weight]) => score + review.scores[dimension] * weight,
    0
  );

  return {
    id: review.id,
    projectId: review.projectId,
    reviewerId: review.reviewerId,
    mode: review.mode,
    discipline: review.discipline,
    weightedScore: round(weightedScore),
    flags: [
      review.scores.reproducibility < 3 ? "reproducibility_followup" : null,
      review.mode === "anonymous" && review.conflictDeclared
        ? "anonymous_conflict_declared"
        : null
    ].filter(Boolean),
    publicSummary:
      review.mode === "public"
        ? review.summary
        : "Summary hidden by review visibility mode."
  };
}

export function anchorInlineComment(comment) {
  return {
    id: comment.id,
    projectId: comment.projectId,
    authorId: comment.authorId,
    target: {
      kind: comment.targetKind,
      path: comment.path,
      selector: comment.selector
    },
    body: comment.body,
    visibility: comment.visibility,
    resolved: Boolean(comment.resolved)
  };
}

export function assignContributorCredits(contributions) {
  const byUser = new Map();
  for (const contribution of contributions) {
    const current = byUser.get(contribution.userId) || {
      userId: contribution.userId,
      totalCredit: 0,
      roles: {}
    };
    const weight = CREDIT_WEIGHTS[contribution.role] || 1;
    const points = weight * contribution.units;
    current.totalCredit += points;
    current.roles[contribution.role] =
      (current.roles[contribution.role] || 0) + points;
    byUser.set(contribution.userId, current);
  }

  return [...byUser.values()].map((entry) => ({
    ...entry,
    totalCredit: round(entry.totalCredit)
  }));
}

export function calculateReputation({ userId, reviews, credits, endorsements, bounties }) {
  const reviewScore =
    reviews.length === 0
      ? 0
      : reviews.reduce((sum, review) => sum + review.weightedScore, 0) /
        reviews.length;
  const creditScore = Math.min(100, credits.totalCredit);
  const endorsementScore = endorsements.length * 4;
  const bountyScore = bounties.completed * 12;
  const reproducibilityBonus = bounties.reproducibilityBadges * 6;
  const score = round(
    reviewScore * 12 + creditScore * 0.35 + endorsementScore + bountyScore + reproducibilityBonus
  );

  return {
    userId,
    score,
    components: {
      reviewScore: round(reviewScore * 12),
      creditScore: round(creditScore * 0.35),
      endorsementScore,
      bountyScore,
      reproducibilityBonus
    },
    tier:
      score >= 90
        ? "open_science_champion"
        : score >= 65
          ? "trusted_reviewer"
          : score >= 40
            ? "active_contributor"
            : "emerging_researcher"
  };
}

export function awardBadges(reputation, normalizedReviews) {
  const badges = [];
  if (reputation.tier === "open_science_champion") {
    badges.push("Open Science Champion");
  }
  if (normalizedReviews.length >= 2 && normalizedReviews.every((review) => review.weightedScore >= 4)) {
    badges.push("Trusted Reviewer");
  }
  if (normalizedReviews.some((review) => review.flags.includes("reproducibility_followup"))) {
    badges.push("Reproducibility Mentor");
  }
  return badges;
}

export function buildProjectTimeline({ reviews, comments, contributions }) {
  const events = [
    ...reviews.map((review) => ({
      type: "peer_review",
      actorId: review.reviewerId,
      projectId: review.projectId,
      label: `${review.discipline} review (${review.mode})`
    })),
    ...comments.map((comment) => ({
      type: "inline_comment",
      actorId: comment.authorId,
      projectId: comment.projectId,
      label: `${comment.target.kind}:${comment.target.path}`
    })),
    ...contributions.map((contribution) => ({
      type: "credit",
      actorId: contribution.userId,
      projectId: contribution.projectId,
      label: contribution.role
    }))
  ];

  return events.sort((a, b) => a.type.localeCompare(b.type));
}

export function buildLeaderboard(reputations) {
  return [...reputations]
    .sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId))
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}
