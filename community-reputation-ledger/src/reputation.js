export const CREDIT_ROLES = [
  "Conceptualization",
  "Data Curation",
  "Formal Analysis",
  "Funding Acquisition",
  "Investigation",
  "Methodology",
  "Peer Review",
  "Project Administration",
  "Resources",
  "Software",
  "Supervision",
  "Validation",
  "Visualization",
  "Writing"
];

const REVIEW_TEMPLATES = {
  biology: ["clarity", "rigor", "novelty", "reproducibility"],
  physics: ["clarity", "mathematical_rigor", "novelty", "replicability"],
  "social-science": ["clarity", "method_validity", "ethics", "reproducibility"]
};

const sum = (values) => values.reduce((total, value) => total + value, 0);

export function resolveReviewVisibility(review) {
  if (review.mode === "public") return { reviewerVisible: true, bodyVisibleTo: "everyone" };
  if (review.mode === "semi-private") return { reviewerVisible: true, bodyVisibleTo: "authors-and-reviewers" };
  if (review.mode === "blind") return { reviewerVisible: false, bodyVisibleTo: "authors-and-reviewers" };
  if (review.mode === "double-blind") return { reviewerVisible: false, bodyVisibleTo: "assigned-reviewers-only" };
  throw new Error(`Unsupported review mode: ${review.mode}`);
}

export function buildPeerReview(review) {
  const dimensions = REVIEW_TEMPLATES[review.discipline] ?? REVIEW_TEMPLATES.biology;
  const missingScores = dimensions.filter((dimension) => typeof review.scores[dimension] !== "number");
  const scoreValues = dimensions.map((dimension) => review.scores[dimension] ?? 0);
  return {
    id: review.id,
    projectId: review.projectId,
    reviewerId: resolveReviewVisibility(review).reviewerVisible ? review.reviewerId : "anonymous-reviewer",
    mode: review.mode,
    visibility: resolveReviewVisibility(review),
    dimensions,
    missingScores,
    averageScore: Number((sum(scoreValues) / dimensions.length).toFixed(2)),
    summary: review.summary,
    createdAt: review.createdAt
  };
}

export function createInlineComment(comment) {
  const validTypes = new Set(["document", "dataset", "code", "notebook"]);
  if (!validTypes.has(comment.target.type)) {
    throw new Error(`Unsupported comment target type: ${comment.target.type}`);
  }
  return {
    id: comment.id,
    projectId: comment.projectId,
    authorId: comment.authorId,
    anchor: `${comment.target.type}:${comment.target.id}:${comment.target.range ?? "all"}`,
    text: comment.text,
    visibility: comment.visibility,
    createdAt: comment.createdAt
  };
}

export function recordContribution(contribution) {
  if (!CREDIT_ROLES.includes(contribution.role)) {
    throw new Error(`Unsupported CRediT role: ${contribution.role}`);
  }
  return {
    ...contribution,
    credited: true,
    graphWeight: Math.max(1, contribution.weight)
  };
}

export function buildContributorGraph(contributions) {
  const records = contributions.map(recordContribution);
  const nodes = Object.values(
    records.reduce((acc, contribution) => {
      acc[contribution.userId] ??= { id: contribution.userId, weight: 0, roles: new Set() };
      acc[contribution.userId].weight += contribution.graphWeight;
      acc[contribution.userId].roles.add(contribution.role);
      return acc;
    }, {})
  ).map((node) => ({ ...node, roles: [...node.roles].sort() }));
  const edges = records.map((contribution) => ({
    from: contribution.userId,
    to: contribution.projectId,
    role: contribution.role,
    weight: contribution.graphWeight
  }));
  return { nodes, edges };
}

export function calculateReputation(user, contributions = []) {
  const metrics = user.metrics;
  const contributionDiversity = new Set(contributions.filter((item) => item.userId === user.id).map((item) => item.role)).size;
  const score =
    Math.min(25, Math.round(metrics.citations / 80)) +
    Math.min(15, metrics.forks) +
    Math.min(15, Math.round(metrics.endorsements / 3)) +
    Math.min(20, Math.round((metrics.reviewQuality * metrics.reviewsCompleted) / 100)) +
    Math.min(15, Math.round(metrics.reproducibilityScore / 7)) +
    Math.min(10, metrics.bountyCompletions * 3) +
    contributionDiversity * 2;
  return {
    userId: user.id,
    name: user.name,
    domain: user.domain,
    institution: user.institution,
    score,
    components: {
      citations: metrics.citations,
      forks: metrics.forks,
      endorsements: metrics.endorsements,
      reviewQuality: metrics.reviewQuality,
      reproducibilityScore: metrics.reproducibilityScore,
      bountyCompletions: metrics.bountyCompletions,
      contributionDiversity
    }
  };
}

export function assignBadges(reputation) {
  const badges = [];
  if (reputation.components.reviewQuality >= 88) badges.push("Trusted Reviewer");
  if (reputation.components.reproducibilityScore >= 90) badges.push("Reproducibility Steward");
  if (reputation.components.contributionDiversity >= 2) badges.push("Open Science Champion");
  if (reputation.components.bountyCompletions > 0) badges.push("Bounty Finisher");
  return badges;
}

export function buildLeaderboard(users, contributions, filter = {}) {
  return users
    .filter((user) => (filter.domain ? user.domain === filter.domain : true))
    .filter((user) => (filter.institution ? user.institution === filter.institution : true))
    .map((user) => {
      const reputation = calculateReputation(user, contributions);
      return { ...reputation, badges: assignBadges(reputation) };
    })
    .sort((a, b) => b.score - a.score);
}

export function buildProjectTimeline({ reviews, comments, contributions }) {
  const reviewEvents = reviews.map((review) => ({
    at: review.createdAt,
    type: "review.created",
    actorId: review.reviewerId,
    target: review.projectId
  }));
  const commentEvents = comments.map((comment) => ({
    at: comment.createdAt,
    type: "comment.created",
    actorId: comment.authorId,
    target: comment.target.id
  }));
  const contributionEvents = contributions.map((contribution) => ({
    at: contribution.at,
    type: "contribution.credited",
    actorId: contribution.userId,
    target: contribution.role
  }));
  return [...reviewEvents, ...commentEvents, ...contributionEvents].sort((a, b) => a.at.localeCompare(b.at));
}

export function buildCommunityDashboard({ users, project, reviews, comments, contributions }) {
  const renderedReviews = reviews.map(buildPeerReview);
  const inlineComments = comments.map(createInlineComment);
  const contributorGraph = buildContributorGraph(contributions);
  const leaderboard = buildLeaderboard(users, contributions, { domain: project.domain });
  const timeline = buildProjectTimeline({ reviews, comments, contributions });
  return {
    project,
    reviews: renderedReviews,
    inlineComments,
    contributorGraph,
    leaderboard,
    timeline,
    summary: {
      reviewCount: renderedReviews.length,
      commentCount: inlineComments.length,
      contributorCount: contributorGraph.nodes.length,
      topReputationScore: leaderboard[0]?.score ?? 0
    }
  };
}
