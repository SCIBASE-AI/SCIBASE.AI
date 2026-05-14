import {
  anchorInlineComment,
  assignContributorCredits,
  awardBadges,
  buildLeaderboard,
  buildProjectTimeline,
  calculateReputation,
  normalizeReview
} from "./trust-ledger.js";
import { bounties, comments, contributions, endorsements, reviews } from "./sample-data.js";

export function buildDemoReport() {
  const normalizedReviews = reviews.map(normalizeReview);
  const anchoredComments = comments.map(anchorInlineComment);
  const credits = assignContributorCredits(contributions);
  const reputations = credits.map((credit) => {
    const userReviews = normalizedReviews.filter((review) => review.reviewerId === credit.userId);
    return calculateReputation({
      userId: credit.userId,
      reviews: userReviews,
      credits: credit,
      endorsements: endorsements[credit.userId] || [],
      bounties: bounties[credit.userId] || { completed: 0, reproducibilityBadges: 0 }
    });
  });

  return {
    normalizedReviews,
    anchoredComments,
    credits,
    reputations: reputations.map((reputation) => ({
      ...reputation,
      badges: awardBadges(
        reputation,
        normalizedReviews.filter((review) => review.reviewerId === reputation.userId)
      )
    })),
    leaderboard: buildLeaderboard(reputations),
    timeline: buildProjectTimeline({
      reviews: normalizedReviews,
      comments: anchoredComments,
      contributions
    })
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildDemoReport(), null, 2));
}
