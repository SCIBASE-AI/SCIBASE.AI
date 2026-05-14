import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoReport } from "../src/demo.js";
import {
  anchorInlineComment,
  assignContributorCredits,
  awardBadges,
  buildLeaderboard,
  calculateReputation,
  normalizeReview
} from "../src/trust-ledger.js";

test("normalizes structured peer reviews by weighted dimensions", () => {
  const review = normalizeReview({
    id: "r",
    projectId: "p",
    reviewerId: "u",
    mode: "public",
    discipline: "biology",
    summary: "Useful review",
    conflictDeclared: false,
    scores: { clarity: 5, rigor: 4, novelty: 3, reproducibility: 2 }
  });

  assert.equal(review.weightedScore, 3.46);
  assert.deepEqual(review.flags, ["reproducibility_followup"]);
  assert.equal(review.publicSummary, "Useful review");
});

test("anchors inline comments to datasets, code, notebooks, or documents", () => {
  const comment = anchorInlineComment({
    id: "c",
    projectId: "p",
    authorId: "u",
    targetKind: "code",
    path: "src/model.py",
    selector: "L42",
    body: "Explain this threshold.",
    visibility: "semi_private",
    resolved: false
  });

  assert.equal(comment.target.kind, "code");
  assert.equal(comment.resolved, false);
});

test("assigns CRediT-style contribution scores", () => {
  const credits = assignContributorCredits([
    { userId: "a", role: "software", units: 2 },
    { userId: "a", role: "writing", units: 1 },
    { userId: "b", role: "data_curation", units: 3 }
  ]);

  assert.deepEqual(
    credits.map((credit) => [credit.userId, credit.totalCredit]),
    [["a", 22], ["b", 21]]
  );
});

test("calculates transparent reputation components", () => {
  const reputation = calculateReputation({
    userId: "a",
    reviews: [{ weightedScore: 4.5 }],
    credits: { totalCredit: 80 },
    endorsements: ["pi"],
    bounties: { completed: 1, reproducibilityBadges: 1 }
  });

  assert.equal(reputation.score, 104);
  assert.equal(reputation.tier, "open_science_champion");
});

test("awards badges from review quality and reproducibility flags", () => {
  const badges = awardBadges(
    { tier: "open_science_champion" },
    [
      { weightedScore: 4.2, flags: [] },
      { weightedScore: 4.1, flags: ["reproducibility_followup"] }
    ]
  );

  assert.deepEqual(badges, [
    "Open Science Champion",
    "Trusted Reviewer",
    "Reproducibility Mentor"
  ]);
});

test("builds deterministic leaderboard and demo report", () => {
  const leaderboard = buildLeaderboard([
    { userId: "b", score: 42 },
    { userId: "a", score: 42 },
    { userId: "c", score: 50 }
  ]);
  const report = buildDemoReport();

  assert.deepEqual(
    leaderboard.map((entry) => entry.userId),
    ["c", "a", "b"]
  );
  assert.equal(report.normalizedReviews.length, 3);
  assert.equal(report.timeline.length, 10);
});
