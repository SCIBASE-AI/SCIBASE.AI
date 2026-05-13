import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignBadges,
  buildCommunityDashboard,
  buildContributorGraph,
  buildLeaderboard,
  buildPeerReview,
  buildProjectTimeline,
  calculateReputation,
  createInlineComment,
  recordContribution
} from "../src/reputation.js";
import { sampleComments, sampleContributions, sampleProject, sampleReviews, sampleUsers } from "../src/sample-data.js";

test("peer reviews apply discipline template and anonymity mode", () => {
  const review = buildPeerReview(sampleReviews[1]);

  assert.equal(review.reviewerId, "anonymous-reviewer");
  assert.equal(review.visibility.bodyVisibleTo, "assigned-reviewers-only");
  assert.deepEqual(review.missingScores, []);
  assert.ok(review.averageScore >= 7);
});

test("inline comments are anchored to supported scientific object types", () => {
  const comment = createInlineComment(sampleComments[0]);

  assert.equal(comment.anchor, "notebook:analysis-qc:cell:4");
  assert.equal(comment.visibility, "authors-and-reviewers");
});

test("CRediT contributions build a weighted contributor graph", () => {
  const contribution = recordContribution(sampleContributions[0]);
  const graph = buildContributorGraph(sampleContributions);

  assert.equal(contribution.credited, true);
  assert.equal(graph.nodes.length, 3);
  assert.equal(graph.edges.length, sampleContributions.length);
  assert.ok(graph.nodes.find((node) => node.id === "user-alina").roles.includes("Software"));
});

test("reputation scoring and badges are transparent", () => {
  const reputation = calculateReputation(sampleUsers[0], sampleContributions);
  const badges = assignBadges(reputation);

  assert.ok(reputation.score > 70);
  assert.ok(badges.includes("Trusted Reviewer"));
  assert.ok(badges.includes("Reproducibility Steward"));
  assert.ok(badges.includes("Bounty Finisher"));
});

test("leaderboard filters by domain and sorts descending", () => {
  const leaderboard = buildLeaderboard(sampleUsers, sampleContributions, { domain: "computational-biology" });

  assert.equal(leaderboard.length, 2);
  assert.ok(leaderboard[0].score >= leaderboard[1].score);
  assert.ok(leaderboard.every((entry) => entry.domain === "computational-biology"));
});

test("project timeline merges review, comment, and contribution events", () => {
  const timeline = buildProjectTimeline({
    reviews: sampleReviews,
    comments: sampleComments,
    contributions: sampleContributions
  });

  assert.equal(timeline.length, sampleReviews.length + sampleComments.length + sampleContributions.length);
  assert.equal(timeline[0].type, "contribution.credited");
});

test("dashboard exposes community review summary", () => {
  const dashboard = buildCommunityDashboard({
    users: sampleUsers,
    project: sampleProject,
    reviews: sampleReviews,
    comments: sampleComments,
    contributions: sampleContributions
  });

  assert.equal(dashboard.summary.reviewCount, 2);
  assert.equal(dashboard.summary.contributorCount, 3);
  assert.ok(dashboard.leaderboard[0].badges.length > 0);
});
