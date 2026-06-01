export const riskyReputationPacket = {
  reviewWindow: "2026-06",
  clusterId: "cluster-rho-17",
  users: [
    { userId: "u-104", payoutHandle: "wallet-alpha", deviceFingerprint: "fp-77", invitedBy: "u-101", reputationDelta: 38 },
    { userId: "u-105", payoutHandle: "wallet-alpha", deviceFingerprint: "fp-77", invitedBy: "u-101", reputationDelta: 41 },
    { userId: "u-106", payoutHandle: "wallet-beta", deviceFingerprint: "fp-77", invitedBy: "u-105", reputationDelta: 36 },
    { userId: "u-107", payoutHandle: "wallet-gamma", deviceFingerprint: "fp-88", invitedBy: "u-106", reputationDelta: 4 },
  ],
  endorsements: [
    { from: "u-104", to: "u-105", projectId: "bounty-1", createdMinutesAfterSignup: 9 },
    { from: "u-105", to: "u-106", projectId: "bounty-1", createdMinutesAfterSignup: 11 },
    { from: "u-106", to: "u-104", projectId: "bounty-2", createdMinutesAfterSignup: 13 },
    { from: "u-107", to: "u-104", projectId: "bounty-2", createdMinutesAfterSignup: 15 },
  ],
  reviews: [
    { reviewer: "u-104", submitter: "u-105", projectId: "bounty-1", score: 5 },
    { reviewer: "u-105", submitter: "u-106", projectId: "bounty-1", score: 5 },
    { reviewer: "u-106", submitter: "u-104", projectId: "bounty-2", score: 5 },
  ],
  controls: {
    quarantineApplied: false,
    manualReviewTicket: null,
    leaderboardSuppressed: false,
    payoutEligibilityPaused: false,
  },
};

export const cleanReputationPacket = {
  reviewWindow: "2026-06",
  clusterId: "cluster-eta-04",
  users: [
    { userId: "u-201", payoutHandle: "wallet-201", deviceFingerprint: "fp-201", invitedBy: "seed", reputationDelta: 12 },
    { userId: "u-202", payoutHandle: "wallet-202", deviceFingerprint: "fp-202", invitedBy: "seed", reputationDelta: 9 },
    { userId: "u-203", payoutHandle: "wallet-203", deviceFingerprint: "fp-203", invitedBy: "u-201", reputationDelta: 6 },
  ],
  endorsements: [
    { from: "u-201", to: "u-202", projectId: "bounty-7", createdMinutesAfterSignup: 1440 },
    { from: "u-202", to: "u-203", projectId: "bounty-8", createdMinutesAfterSignup: 2880 },
  ],
  reviews: [
    { reviewer: "u-201", submitter: "u-203", projectId: "bounty-8", score: 4 },
  ],
  controls: {
    quarantineApplied: true,
    manualReviewTicket: "REP-2048",
    leaderboardSuppressed: true,
    payoutEligibilityPaused: true,
  },
};
