const cleanPacket = {
  reviewDate: "2026-06-01",
  policy: {
    equalNoticeToleranceHours: 12,
    disputeHoldDays: 10,
    maxReimbursementPercent: 0.35,
    materialReductionThresholdPercent: 25,
    milestoneCreditRate: 0.18,
    irreversibleSpendRequiresReceipt: true,
    requireSponsorFundedReserve: true
  },
  challenges: [
    {
      id: "BNTY-WITHDRAW-ALPHA",
      title: "Federated reproducibility benchmark",
      status: "withdrawn",
      sponsor: {
        id: "sponsor-lab-a",
        cancellationAuthority: true,
        reimbursementReserveUsd: 2200
      },
      bounty: {
        amountUsd: 6000,
        reimbursementCapUsd: 2100
      },
      cancellation: {
        type: "withdrawal",
        requestedAt: "2026-05-28T15:00:00Z",
        effectiveAt: "2026-06-07T15:00:00Z",
        reason: "Sponsor lost access to the proprietary validation corpus and withdrew before finalist scoring.",
        authorizedBy: "sponsor-owner-17",
        materialReductionPercent: 100,
        appealDeadline: "2026-06-06T15:00:00Z",
        disputeHoldUntil: "2026-06-08T15:00:00Z"
      },
      communications: {
        sponsorNoticeAt: "2026-05-28T15:10:00Z",
        solverNotices: [
          {
            teamId: "team-curie",
            sentAt: "2026-05-28T15:15:00Z",
            channel: "platform",
            includesAppealWindow: true,
            includesCostClaimLink: true
          },
          {
            teamId: "team-noether",
            sentAt: "2026-05-28T16:00:00Z",
            channel: "platform",
            includesAppealWindow: true,
            includesCostClaimLink: true
          }
        ]
      },
      solvers: [
        {
          teamId: "team-curie",
          acceptedAt: "2026-05-20T12:00:00Z",
          startedAt: "2026-05-21T09:00:00Z",
          milestoneProgressPercent: 42,
          submittedMilestones: [
            { id: "design-review", percent: 25, evidenceHash: "sha256:curie-design-review-0a1b2c3d4e" },
            { id: "baseline-run", percent: 17, evidenceHash: "sha256:curie-baseline-run-0a1b2c3d4e" }
          ],
          costClaims: [
            {
              id: "cloud-prep",
              amountUsd: 180,
              category: "compute",
              incurredAt: "2026-05-25",
              nonRefundable: true,
              evidenceHash: "sha256:curie-cloud-evidence-0a1b2c3d4e",
              receiptHash: "sha256:curie-cloud-receipt-0a1b2c3d4e"
            }
          ],
          ipReturn: {
            returnedAt: "2026-05-30T12:00:00Z",
            dataDestroyedAt: "2026-05-30T12:15:00Z",
            attestationHash: "sha256:curie-return-attestation-0a1b2c3d4e"
          }
        },
        {
          teamId: "team-noether",
          acceptedAt: "2026-05-22T13:30:00Z",
          startedAt: "2026-05-23T10:00:00Z",
          milestoneProgressPercent: 28,
          submittedMilestones: [
            { id: "replication-plan", percent: 28, evidenceHash: "sha256:noether-plan-evidence-0a1b2c3d4e" }
          ],
          costClaims: [
            {
              id: "dataset-access",
              amountUsd: 140,
              category: "data",
              incurredAt: "2026-05-24",
              nonRefundable: true,
              evidenceHash: "sha256:noether-data-evidence-0a1b2c3d4e",
              receiptHash: "sha256:noether-data-receipt-0a1b2c3d4e"
            }
          ],
          ipReturn: {
            returnedAt: "2026-05-30T13:00:00Z",
            dataDestroyedAt: "2026-05-30T13:20:00Z",
            attestationHash: "sha256:noether-return-attestation-0a1b2c3d4e"
          }
        }
      ],
      reimbursements: [
        {
          teamId: "team-curie",
          amountUsd: 633.60,
          approvedBy: "bounty-ops",
          approvedAt: "2026-05-31T10:00:00Z"
        },
        {
          teamId: "team-noether",
          amountUsd: 442.40,
          approvedBy: "bounty-ops",
          approvedAt: "2026-05-31T10:05:00Z"
        }
      ]
    }
  ]
};

const riskyPacket = {
  reviewDate: "2026-06-01",
  policy: {
    equalNoticeToleranceHours: 8,
    disputeHoldDays: 10,
    maxReimbursementPercent: 0.35,
    materialReductionThresholdPercent: 25,
    milestoneCreditRate: 0.18,
    irreversibleSpendRequiresReceipt: true,
    requireSponsorFundedReserve: true
  },
  challenges: [
    {
      id: "BNTY-WITHDRAW-RISK",
      title: "Private clinical signal challenge",
      status: "canceled",
      sponsor: {
        id: "sponsor-clinic-x",
        cancellationAuthority: false,
        reimbursementReserveUsd: 300
      },
      bounty: {
        amountUsd: 9000,
        reimbursementCapUsd: 2600
      },
      cancellation: {
        type: "cancellation",
        requestedAt: "2026-05-29T11:00:00Z",
        effectiveAt: "2026-05-30T11:00:00Z",
        reason: "Budget changed",
        materialReductionPercent: 100,
        disputeHoldUntil: "2026-06-02T11:00:00Z"
      },
      communications: {
        sponsorNoticeAt: "2026-05-29T12:00:00Z",
        solverNotices: [
          {
            teamId: "team-lovelace",
            sentAt: "2026-05-29T13:00:00Z",
            channel: "email",
            includesAppealWindow: false,
            includesCostClaimLink: false
          },
          {
            teamId: "team-hopper",
            sentAt: "2026-05-30T09:00:00Z",
            channel: "email",
            includesAppealWindow: false,
            includesCostClaimLink: true
          }
        ]
      },
      solvers: [
        {
          teamId: "team-lovelace",
          acceptedAt: "2026-05-20T12:00:00Z",
          startedAt: "2026-05-21T08:00:00Z",
          milestoneProgressPercent: 45,
          submittedMilestones: [
            { id: "baseline-model", percent: 35, evidenceHash: "" },
            { id: "validation-report", percent: 10, evidenceHash: "sha256:lovelace-report-evidence-0a1b2c3d4e" }
          ],
          costClaims: [
            {
              id: "gpu-reservation",
              amountUsd: 720,
              category: "compute",
              incurredAt: "2026-05-24",
              nonRefundable: true,
              evidenceHash: "sha256:lovelace-gpu-evidence-0a1b2c3d4e",
              receiptHash: ""
            },
            {
              id: "annotation-vendor",
              amountUsd: 420,
              category: "annotation",
              incurredAt: "2026-05-25",
              nonRefundable: true,
              evidenceHash: "",
              receiptHash: ""
            }
          ],
          ipReturn: {
            returnedAt: "",
            dataDestroyedAt: "",
            attestationHash: ""
          }
        },
        {
          teamId: "team-hopper",
          acceptedAt: "2026-05-22T10:00:00Z",
          startedAt: "2026-05-23T09:00:00Z",
          milestoneProgressPercent: 20,
          submittedMilestones: [],
          costClaims: [
            {
              id: "secure-workspace",
              amountUsd: 310,
              category: "workspace",
              incurredAt: "2026-05-24",
              nonRefundable: true,
              evidenceHash: "sha256:hopper-workspace-evidence-0a1b2c3d4e",
              receiptHash: ""
            }
          ],
          ipReturn: null
        },
        {
          teamId: "team-johnson",
          acceptedAt: "2026-05-23T10:00:00Z",
          startedAt: "2026-05-24T09:00:00Z",
          milestoneProgressPercent: 15,
          submittedMilestones: [
            { id: "error-analysis", percent: 15, evidenceHash: "sha256:johnson-error-analysis-0a1b2c3d4e" }
          ],
          costClaims: [
            {
              id: "dataset-license",
              amountUsd: 260,
              category: "data",
              incurredAt: "2026-05-25",
              nonRefundable: true,
              evidenceHash: "sha256:johnson-license-evidence-0a1b2c3d4e",
              receiptHash: "sha256:johnson-license-receipt-0a1b2c3d4e"
            }
          ],
          ipReturn: {
            returnedAt: "2026-05-31T12:00:00Z",
            dataDestroyedAt: "",
            attestationHash: ""
          }
        }
      ],
      reimbursements: [
        {
          teamId: "team-lovelace",
          amountUsd: 500,
          approvedBy: "sponsor-admin",
          approvedAt: "2026-05-30T12:00:00Z"
        }
      ]
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
