const auditPolicy = {
  reviewDate: "2026-05-28T00:00:00Z",
  reciprocalWindowHours: 72,
  burstWindowHours: 24,
  maxEndorsementsPerActorWindow: 3,
  maxSharedSignalEdges: 2,
  maxReviewerOverlapRatio: 0.5,
  maxDailyReputationDelta: 40,
};

const riskyBatch = {
  batchId: "reputation-batch-2026-05-ring",
  users: [
    { id: "user-alpha", affiliationDomain: "lab.example" },
    { id: "user-beta", affiliationDomain: "lab.example" },
    { id: "user-gamma", affiliationDomain: "lab.example" },
    { id: "user-delta", affiliationDomain: "external.example" },
  ],
  events: [
    {
      id: "evt-1",
      type: "endorsement",
      actorUserId: "user-alpha",
      targetUserId: "user-beta",
      createdAt: "2026-05-28T01:00:00Z",
      evidenceUrl: "",
      projectContributionId: "",
      signals: { sameAffiliationDomain: true, sameInviteBatch: true },
    },
    {
      id: "evt-2",
      type: "endorsement",
      actorUserId: "user-beta",
      targetUserId: "user-alpha",
      createdAt: "2026-05-28T03:00:00Z",
      evidenceUrl: "",
      projectContributionId: "",
      signals: { sameAffiliationDomain: true, sharedRecoveryEmail: true },
    },
    {
      id: "evt-3",
      type: "endorsement",
      actorUserId: "user-alpha",
      targetUserId: "user-gamma",
      createdAt: "2026-05-28T04:00:00Z",
      evidenceUrl: "",
      projectContributionId: "contrib-1",
      signals: { sameAffiliationDomain: true, sameInviteBatch: true },
    },
    {
      id: "evt-4",
      type: "endorsement",
      actorUserId: "user-alpha",
      targetUserId: "user-delta",
      createdAt: "2026-05-28T05:00:00Z",
      evidenceUrl: "",
      projectContributionId: "",
      signals: { sharedDeviceFingerprint: true },
    },
    {
      id: "evt-5",
      type: "endorsement",
      actorUserId: "user-alpha",
      targetUserId: "user-beta",
      createdAt: "2026-05-28T06:00:00Z",
      evidenceUrl: "",
      projectContributionId: "",
      signals: { sameAffiliationDomain: true },
    },
  ],
  reputationChanges: [
    {
      id: "rep-1",
      targetUserId: "user-beta",
      delta: 55,
      reviewers: ["user-alpha", "user-alpha", "user-alpha"],
      badgeAwarded: "trusted-reviewer",
      badgeCriteriaSnapshotId: "",
    },
  ],
};

const readyBatch = {
  batchId: "reputation-batch-2026-05-clean",
  users: [
    { id: "user-owner", affiliationDomain: "uni.example" },
    { id: "user-reviewer", affiliationDomain: "lab.example" },
    { id: "user-methods", affiliationDomain: "institute.example" },
  ],
  events: [
    {
      id: "evt-1",
      type: "endorsement",
      actorUserId: "user-reviewer",
      targetUserId: "user-owner",
      createdAt: "2026-05-28T01:00:00Z",
      evidenceUrl: "https://example.invalid/contrib/1",
      projectContributionId: "contrib-1",
      signals: {},
    },
    {
      id: "evt-2",
      type: "endorsement",
      actorUserId: "user-methods",
      targetUserId: "user-owner",
      createdAt: "2026-05-30T01:00:00Z",
      evidenceUrl: "https://example.invalid/contrib/2",
      projectContributionId: "contrib-2",
      signals: {},
    },
  ],
  reputationChanges: [
    {
      id: "rep-1",
      targetUserId: "user-owner",
      delta: 25,
      reviewers: ["user-reviewer", "user-methods"],
      badgeAwarded: "reproducibility-helper",
      badgeCriteriaSnapshotId: "badge-snapshot-1",
    },
  ],
};

module.exports = {
  auditPolicy,
  readyBatch,
  riskyBatch,
};
