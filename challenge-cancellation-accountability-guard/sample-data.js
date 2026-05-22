export const cancellationPolicy = {
  minimumAppealWindowDays: 7,
  requiredReasonEvidence: ["sponsor_memo", "review_minutes", "finance_ledger"],
  requiredNoAwardReviewFields: ["rubricScore", "reviewerId", "decisionReason"],
  compensationFloorPct: 0.15,
  refundBlockedUntilAppealWindowCloses: true,
  solverKeepsIpUntilSettlement: true,
}

export const challengeCancellations = [
  {
    id: "sci-bio-forecast-2026",
    title: "Biomarker forecast challenge",
    status: "cancelled",
    decisionAt: "2026-06-18T10:00:00Z",
    workStartedAt: "2026-06-02T10:00:00Z",
    reason: {
      category: "sponsor_budget_withdrawal",
      memoId: "memo-44",
      evidence: ["sponsor_memo", "finance_ledger"],
    },
    escrow: {
      fundedCents: 1200000,
      refundRequestedCents: 900000,
      compensationReleasedCents: 0,
      heldCents: 1200000,
    },
    appealWindowClosesAt: "2026-06-20T10:00:00Z",
    solvers: [
      {
        teamId: "lab-alpha",
        workStartedAt: "2026-06-03T09:00:00Z",
        lastArtifactAt: "2026-06-16T18:10:00Z",
        notificationSentAt: "2026-06-18T12:00:00Z",
        reviewRecord: null,
        ipState: "solver_retained",
      },
      {
        teamId: "student-gamma",
        workStartedAt: "2026-06-04T11:00:00Z",
        lastArtifactAt: "2026-06-14T16:00:00Z",
        notificationSentAt: null,
        reviewRecord: null,
        ipState: "preview_shared_without_settlement",
      },
    ],
  },
  {
    id: "quantum-noise-round",
    title: "Quantum noise reduction prototype",
    status: "no_award",
    decisionAt: "2026-07-10T12:00:00Z",
    workStartedAt: "2026-06-20T08:00:00Z",
    reason: {
      category: "no_submission_met_threshold",
      memoId: "memo-71",
      evidence: ["sponsor_memo", "review_minutes", "finance_ledger"],
    },
    escrow: {
      fundedCents: 3000000,
      refundRequestedCents: 0,
      compensationReleasedCents: 600000,
      heldCents: 2400000,
    },
    appealWindowClosesAt: "2026-07-22T12:00:00Z",
    solvers: [
      {
        teamId: "qubit-lab",
        workStartedAt: "2026-06-22T14:00:00Z",
        lastArtifactAt: "2026-07-08T19:30:00Z",
        notificationSentAt: "2026-07-10T13:00:00Z",
        reviewRecord: {
          reviewerId: "rev-2",
          rubricScore: 61,
          decisionReason: "below reproducibility threshold",
        },
        ipState: "solver_retained",
      },
      {
        teamId: "noise-team",
        workStartedAt: "2026-06-24T14:00:00Z",
        lastArtifactAt: "2026-07-06T10:30:00Z",
        notificationSentAt: "2026-07-10T13:15:00Z",
        reviewRecord: {
          reviewerId: "rev-4",
          rubricScore: 58,
          decisionReason: "missing benchmark replication",
        },
        ipState: "solver_retained",
      },
    ],
  },
  {
    id: "materials-screening",
    title: "Materials screening holdout model",
    status: "ready_to_close",
    decisionAt: "2026-08-04T09:00:00Z",
    workStartedAt: "2026-07-01T09:00:00Z",
    reason: {
      category: "cancelled_before_private_data_release",
      memoId: "memo-88",
      evidence: ["sponsor_memo", "review_minutes", "finance_ledger"],
    },
    escrow: {
      fundedCents: 900000,
      refundRequestedCents: 0,
      compensationReleasedCents: 180000,
      heldCents: 720000,
    },
    appealWindowClosesAt: "2026-08-15T09:00:00Z",
    solvers: [
      {
        teamId: "materials-delta",
        workStartedAt: "2026-07-05T11:30:00Z",
        lastArtifactAt: "2026-07-29T21:00:00Z",
        notificationSentAt: "2026-08-04T10:00:00Z",
        reviewRecord: {
          reviewerId: "rev-7",
          rubricScore: 74,
          decisionReason: "challenge cancelled before final sponsor data release",
        },
        ipState: "solver_retained",
      },
    ],
  },
]
