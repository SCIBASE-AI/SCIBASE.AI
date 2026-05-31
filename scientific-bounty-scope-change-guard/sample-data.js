const baseRubric = [
  { id: 'accuracy', label: 'Scientific accuracy', weight: 35, maxPoints: 35 },
  { id: 'reproducibility', label: 'Reproducibility evidence', weight: 30, maxPoints: 30 },
  { id: 'novelty', label: 'Novelty and impact', weight: 20, maxPoints: 20 },
  { id: 'delivery', label: 'Deliverable completeness', weight: 15, maxPoints: 15 }
];

const challenge = {
  challengeId: 'sci-bounty-biomarker-2026',
  title: 'Single-cell biomarker discovery challenge',
  launchedAt: '2026-05-01T12:00:00Z',
  submissionDeadline: '2026-06-01T23:59:00Z',
  baseline: {
    problemStatement: 'Identify robust biomarkers from the released single-cell RNA-seq cohort.',
    deliverables: ['working notebook', 'ranked biomarker CSV', 'methodology memo'],
    rubric: baseRubric,
    eligibility: { allowedTeams: ['academic', 'independent', 'industry'], requiresPriorContribution: false },
    prizeSchedule: { totalUsd: 100000, milestones: [{ name: 'winner', usd: 80000 }, { name: 'runner-up', usd: 20000 }] },
    ndaTerms: { version: 'nda-v1', dataUse: 'challenge-only' },
    dataRoomTerms: { version: 'data-room-v1', exportAllowed: false }
  },
  participants: [
    { teamId: 'lab-alpha', status: 'submitted', registeredAt: '2026-05-02T10:00:00Z', submittedAt: '2026-05-21T15:00:00Z' },
    { teamId: 'team-beta', status: 'registered', registeredAt: '2026-05-04T11:30:00Z' },
    { teamId: 'solo-gamma', status: 'registered', registeredAt: '2026-05-09T09:00:00Z' }
  ]
};

const unsafeScopeChange = {
  id: 'scope-change-unsafe-rubric-and-prize',
  requestedAt: '2026-05-22T09:00:00Z',
  effectiveAt: '2026-05-23T09:00:00Z',
  requestedBy: 'sponsor:pharma-demo',
  changes: {
    deliverables: ['working notebook', 'ranked biomarker CSV', 'methodology memo', 'wet-lab validation plan'],
    rubric: [
      { id: 'accuracy', label: 'Scientific accuracy', weight: 30, maxPoints: 30 },
      { id: 'reproducibility', label: 'Reproducibility evidence', weight: 20, maxPoints: 20 },
      { id: 'wetlab', label: 'Wet-lab validation readiness', weight: 30, maxPoints: 30 },
      { id: 'delivery', label: 'Deliverable completeness', weight: 10, maxPoints: 10 }
    ],
    prizeSchedule: { totalUsd: 90000, milestones: [{ name: 'winner', usd: 90000 }] },
    eligibility: { allowedTeams: ['industry'], requiresPriorContribution: true }
  },
  approvals: {
    sponsor: true,
    independentReviewer: false,
    auditLog: false,
    financeEscrow: false
  },
  notice: {
    sentAt: '2026-05-22T12:00:00Z',
    teamNotices: ['lab-alpha'],
    teamConsents: []
  },
  requiresSolverConsent: true,
  grandfatherSubmittedWork: false,
  grandfatherRegisteredTeams: false,
  deadlineExtensionHours: 0
};

const safeClarification = {
  id: 'scope-change-safe-copy-clarification',
  requestedAt: '2026-05-07T09:00:00Z',
  effectiveAt: '2026-05-12T09:00:00Z',
  requestedBy: 'ops:challenge-admin',
  changes: {
    faq: 'Clarifies that CSV headers may use snake_case or camelCase.'
  },
  approvals: {
    sponsor: true,
    independentReviewer: true,
    auditLog: true,
    financeEscrow: true
  },
  notice: {
    sentAt: '2026-05-07T09:15:00Z',
    teamNotices: ['lab-alpha', 'team-beta', 'solo-gamma'],
    teamConsents: ['lab-alpha', 'team-beta', 'solo-gamma']
  },
  requiresSolverConsent: false,
  grandfatherSubmittedWork: true,
  grandfatherRegisteredTeams: true,
  deadlineExtensionHours: 0,
  equalDataRoomAccess: true
};

const reviewedNdaUpdate = {
  id: 'scope-change-reviewed-data-room-update',
  requestedAt: '2026-05-10T10:00:00Z',
  effectiveAt: '2026-05-16T10:00:00Z',
  requestedBy: 'sponsor:data-office',
  changes: {
    ndaTerms: { version: 'nda-v2', dataUse: 'challenge-only', addsPublicationEmbargoDays: 30 },
    dataRoomTerms: { version: 'data-room-v2', exportAllowed: false, watermarkRequired: true }
  },
  approvals: {
    sponsor: true,
    independentReviewer: true,
    auditLog: true,
    financeEscrow: true
  },
  notice: {
    sentAt: '2026-05-10T10:10:00Z',
    teamNotices: ['lab-alpha', 'team-beta', 'solo-gamma'],
    teamConsents: ['lab-alpha', 'team-beta', 'solo-gamma']
  },
  requiresSolverConsent: true,
  grandfatherSubmittedWork: true,
  grandfatherRegisteredTeams: true,
  deadlineExtensionHours: 120,
  equalDataRoomAccess: true
};

module.exports = {
  challenge,
  unsafeScopeChange,
  safeClarification,
  reviewedNdaUpdate,
  reviewInput: {
    generatedAt: '2026-05-31T05:58:00Z',
    challenge,
    changeRequests: [unsafeScopeChange, safeClarification, reviewedNdaUpdate]
  }
};

