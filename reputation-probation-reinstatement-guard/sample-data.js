"use strict";

const cleanPacket = {
  policy: {
    id: "community-reputation-probation-2026",
    minimumProbationDays: 30,
    requiredRemediationActions: ["moderation-acknowledgement", "updated-profile-attestation"],
    requiredReviewerQuorum: 2,
    maxReentryScoreCapPercent: 50
  },
  users: [
    {
      id: "researcher-alpha",
      probation: {
        reasonCode: "unsupported-review-claim",
        startedAt: "2026-04-20T12:00:00.000Z",
        appealStatus: "resolved",
        receiptHash: "sha256:probation-alpha"
      },
      reinstatement: {
        requestedAt: "2026-05-25T12:00:00.000Z",
        completedActions: ["moderation-acknowledgement", "updated-profile-attestation"],
        reviewers: ["moderator-a", "moderator-b"],
        summaryVisibility: "public-redacted",
        scoreCapPercent: 40
      },
      reputationEvents: [
        { at: "2026-04-18T12:00:00.000Z", delta: 4, applied: true, source: "accepted-review" },
        { at: "2026-05-26T12:00:00.000Z", delta: 0, applied: false, source: "probation-review" }
      ]
    }
  ]
};

const riskyPacket = {
  policy: cleanPacket.policy,
  users: [
    {
      id: "researcher-beta",
      probation: {
        reasonCode: "review-abuse",
        startedAt: "2026-05-20T12:00:00.000Z",
        appealStatus: "open",
        receiptHash: "sha256:probation-beta"
      },
      reinstatement: {
        requestedAt: "2026-05-25T12:00:00.000Z",
        completedActions: ["moderation-acknowledgement"],
        reviewers: ["moderator-a"],
        summaryVisibility: "private",
        scoreCapPercent: 80
      },
      reputationEvents: [
        { at: "2026-05-22T12:00:00.000Z", delta: 6, applied: true, source: "reviewer-badge" },
        { at: "2026-05-23T12:00:00.000Z", delta: 2, applied: true, source: "leaderboard-credit" }
      ]
    },
    {
      id: "researcher-gamma",
      probation: {
        startedAt: "2026-04-10T12:00:00.000Z",
        appealStatus: "resolved"
      },
      reinstatement: {
        completedActions: [],
        reviewers: [],
        summaryVisibility: "public"
      },
      reputationEvents: []
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
