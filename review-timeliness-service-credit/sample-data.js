"use strict";

const reviewLedger = {
  projectId: "proj-replication-graph-42",
  scoringWindowDays: 90,
  privacyMode: "double-blind",
  reviewers: [
    {
      reviewerId: "rev-a",
      displayName: "Reviewer Alpha",
      institution: "North Clinic Lab",
      reviews: [
        {
          reviewId: "r-101",
          assignedAt: "2026-03-01T09:00:00Z",
          dueAt: "2026-03-08T09:00:00Z",
          submittedAt: "2026-03-07T15:20:00Z",
          extensionApproved: false,
          commentCount: 18,
          actionableComments: 14,
          evidenceLinks: 5,
          privacyBreach: false,
        },
        {
          reviewId: "r-102",
          assignedAt: "2026-04-02T09:00:00Z",
          dueAt: "2026-04-09T09:00:00Z",
          submittedAt: "2026-04-13T11:10:00Z",
          extensionApproved: true,
          commentCount: 11,
          actionableComments: 8,
          evidenceLinks: 2,
          privacyBreach: false,
        },
      ],
    },
    {
      reviewerId: "rev-b",
      displayName: "Reviewer Beta",
      institution: "Central Methods Unit",
      reviews: [
        {
          reviewId: "r-201",
          assignedAt: "2026-03-04T09:00:00Z",
          dueAt: "2026-03-11T09:00:00Z",
          submittedAt: "2026-03-20T10:00:00Z",
          extensionApproved: false,
          commentCount: 5,
          actionableComments: 2,
          evidenceLinks: 0,
          privacyBreach: false,
        },
        {
          reviewId: "r-202",
          assignedAt: "2026-04-10T09:00:00Z",
          dueAt: "2026-04-17T09:00:00Z",
          submittedAt: "2026-04-16T14:45:00Z",
          extensionApproved: false,
          commentCount: 13,
          actionableComments: 11,
          evidenceLinks: 4,
          privacyBreach: true,
        },
      ],
    },
  ],
};

module.exports = { reviewLedger };
