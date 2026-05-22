const scenarios = [
  {
    name: 'broken-quorum-and-unrevoked-access',
    challengeId: 'challenge-protein-folding',
    generatedAt: '2026-05-22T15:20:00Z',
    teams: [
      {
        id: 'team-alpha',
        minActiveMembers: 2,
        currentMilestoneDueAt: '2026-05-25T00:00:00Z',
        members: [
          {
            id: 'solver-1',
            status: 'withdrawing',
            noticeAt: '',
            ndaAccepted: true,
            ipReturnConfirmed: false,
            accessRevokedAt: '',
            lastWorkspaceAccessAt: '2026-05-22T14:00:00Z',
          },
          {id: 'solver-2', status: 'active', ndaAccepted: true},
        ],
        artifacts: [{id: 'model-checkpoint', ownerId: 'solver-1', custodyConfirmed: false}],
        notifications: [],
      },
    ],
  },
  {
    name: 'replacement-ready-but-custody-gap',
    challengeId: 'challenge-materials-screen',
    generatedAt: '2026-05-22T15:20:00Z',
    teams: [
      {
        id: 'team-beta',
        minActiveMembers: 2,
        currentMilestoneDueAt: '2026-06-15T00:00:00Z',
        replacementPolicy: {allowsReplacement: true},
        members: [
          {
            id: 'solver-3',
            status: 'withdrawing',
            noticeAt: '2026-05-21T10:00:00Z',
            ndaAccepted: true,
            ipReturnConfirmed: true,
            accessRevokedAt: '2026-05-21T11:00:00Z',
            lastWorkspaceAccessAt: '2026-05-21T09:30:00Z',
          },
          {id: 'solver-4', status: 'active', ndaAccepted: true},
          {id: 'solver-5', status: 'replacement', ndaAccepted: true, replacementEligible: true},
        ],
        artifacts: [{id: 'screening-notebook', ownerId: 'solver-3', custodyConfirmed: false}],
        notifications: [{audience: 'sponsor', sentAt: '2026-05-21T12:00:00Z'}],
      },
    ],
  },
  {
    name: 'clean-continuity-handoff',
    challengeId: 'challenge-climate-nowcast',
    generatedAt: '2026-05-22T15:20:00Z',
    teams: [
      {
        id: 'team-gamma',
        minActiveMembers: 2,
        currentMilestoneDueAt: '2026-06-30T00:00:00Z',
        replacementPolicy: {allowsReplacement: true},
        members: [
          {
            id: 'solver-6',
            status: 'withdrawing',
            noticeAt: '2026-05-20T09:00:00Z',
            ndaAccepted: true,
            ipReturnConfirmed: true,
            accessRevokedAt: '2026-05-20T10:00:00Z',
            lastWorkspaceAccessAt: '2026-05-20T09:30:00Z',
          },
          {id: 'solver-7', status: 'active', ndaAccepted: true},
          {id: 'solver-8', status: 'replacement', ndaAccepted: true, replacementEligible: true},
        ],
        artifacts: [{id: 'nowcast-dataset', ownerId: 'solver-6', custodyConfirmed: true}],
        notifications: [
          {audience: 'sponsor', sentAt: '2026-05-20T10:30:00Z'},
          {audience: 'reviewers', sentAt: '2026-05-20T10:35:00Z'},
        ],
      },
    ],
  },
];

module.exports = {scenarios};
