const project = {
  asOfDate: "2026-05-22",
  policy: {
    maxOpenReviews: 3,
    maxWeeklyReviewHours: 10,
    minimumRestDays: 2,
    concentrationWindowDays: 14,
    maxReviewerConcentrationRatio: 0.35,
    acceptedAvailabilityStatuses: ["available", "limited"],
    protectedPenaltyReasons: ["over_capacity", "unavailable", "rest_window", "opted_out"]
  },
  reviewers: [
    {
      id: "rev-001",
      displayName: "A. Rowan",
      trustTier: "senior",
      availabilityStatus: "limited",
      weeklyCapacityHours: 8,
      recentReviewHours: 9,
      openReviewIds: ["asg-101", "asg-102", "asg-103"],
      lastCompletedReviewAt: "2026-05-21",
      optOutUntil: null,
      unavailableWindows: [{ startsAt: "2026-05-23", endsAt: "2026-05-27", reason: "fieldwork" }],
      expertise: ["astrobiology", "data-curation"],
      profileImpactAllowed: true
    },
    {
      id: "rev-002",
      displayName: "M. Quinn",
      trustTier: "early-career",
      availabilityStatus: "available",
      weeklyCapacityHours: 6,
      recentReviewHours: 5,
      openReviewIds: ["asg-104"],
      lastCompletedReviewAt: "2026-05-16",
      optOutUntil: null,
      unavailableWindows: [],
      expertise: ["statistics", "survey-design"],
      profileImpactAllowed: true
    },
    {
      id: "rev-003",
      displayName: "S. Imani",
      trustTier: "senior",
      availabilityStatus: "unavailable",
      weeklyCapacityHours: 10,
      recentReviewHours: 1,
      openReviewIds: [],
      lastCompletedReviewAt: "2026-05-10",
      optOutUntil: "2026-05-30",
      unavailableWindows: [{ startsAt: "2026-05-20", endsAt: "2026-05-31", reason: "leave" }],
      expertise: ["machine-learning", "statistics"],
      profileImpactAllowed: true
    }
  ],
  pendingAssignments: [
    {
      id: "asg-105",
      reviewerId: "rev-001",
      topic: "data-curation",
      dueDate: "2026-05-24",
      estimatedHours: 4,
      status: "pending",
      reputationDelta: { completion: 8, decline: -4, late: -6 },
      affectsLeaderboard: true
    },
    {
      id: "asg-106",
      reviewerId: "rev-002",
      topic: "quantum-simulation",
      dueDate: "2026-05-25",
      estimatedHours: 5,
      status: "pending",
      reputationDelta: { completion: 10, decline: -5, late: -8 },
      affectsLeaderboard: true
    },
    {
      id: "asg-107",
      reviewerId: "rev-003",
      topic: "machine-learning",
      dueDate: "2026-05-26",
      estimatedHours: 3,
      status: "pending",
      reputationDelta: { completion: 6, decline: -3, late: -5 },
      affectsLeaderboard: true
    }
  ],
  recentAssignmentHistory: [
    { id: "hist-001", reviewerId: "rev-001", assignedAt: "2026-05-12", pointsAwarded: 8 },
    { id: "hist-002", reviewerId: "rev-001", assignedAt: "2026-05-13", pointsAwarded: 7 },
    { id: "hist-003", reviewerId: "rev-001", assignedAt: "2026-05-16", pointsAwarded: 8 },
    { id: "hist-004", reviewerId: "rev-001", assignedAt: "2026-05-19", pointsAwarded: 9 },
    { id: "hist-005", reviewerId: "rev-002", assignedAt: "2026-05-17", pointsAwarded: 6 },
    { id: "hist-006", reviewerId: "rev-003", assignedAt: "2026-05-20", pointsAwarded: 5 }
  ]
};

module.exports = { project };
