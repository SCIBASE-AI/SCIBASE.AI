'use strict';

const { expectedClarificationRoot, digest } = require('./index');

function attachment(id, visibility = 'all_eligible') {
  return {
    id,
    visibility,
    sha256: digest({ id, visibility }),
  };
}

function withRoot(challenge) {
  return {
    ...challenge,
    clarificationRoot: expectedClarificationRoot(challenge),
  };
}

const teams = [
  { id: 'team-alpha', eligible: true },
  { id: 'team-beta', eligible: true },
  { id: 'team-gamma', eligible: true },
  { id: 'team-observer', eligible: false },
];

const cleanChallenge = withRoot({
  challengeId: 'challenge-biomarker-2026',
  title: 'Single-cell biomarker discovery',
  anonymousParticipation: true,
  answerSlaHours: 48,
  teams,
  clarifications: [
    {
      id: 'qa-001',
      requestedByTeamId: 'team-alpha',
      requestedAt: '2026-05-18T08:00:00.000Z',
      answeredAt: '2026-05-18T18:00:00.000Z',
      materiality: 'routine',
      answerVisibility: 'all_eligible',
      attachments: [attachment('example-input-schema')],
      identityReferences: [],
    },
    {
      id: 'qa-002',
      requestedByTeamId: 'team-beta',
      requestedAt: '2026-05-18T09:00:00.000Z',
      answeredAt: '2026-05-19T08:00:00.000Z',
      materiality: 'material',
      answerVisibility: 'all_eligible',
      attachments: [attachment('corrected-sample-labels')],
      identityReferences: [],
    },
  ],
});

const privateAnswerChallenge = withRoot({
  challengeId: 'challenge-forecast-2026',
  title: 'Regional climate forecasting model',
  anonymousParticipation: true,
  answerSlaHours: 48,
  teams,
  clarifications: [
    {
      id: 'qa-private-material',
      requestedByTeamId: 'team-alpha',
      requestedAt: '2026-05-17T10:00:00.000Z',
      answeredAt: '2026-05-17T12:00:00.000Z',
      materiality: 'material',
      answerVisibility: 'requesting_team',
      attachments: [attachment('private-evaluation-grid', 'requesting_team')],
      identityReferences: [],
    },
  ],
});

const scopeChangeChallenge = withRoot({
  challengeId: 'challenge-quantum-noise-2026',
  title: 'Quantum noise reduction benchmark',
  anonymousParticipation: false,
  answerSlaHours: 48,
  teams,
  clarifications: [
    {
      id: 'qa-scope-change',
      requestedByTeamId: 'team-beta',
      requestedAt: '2026-05-17T08:00:00.000Z',
      answeredAt: '2026-05-17T10:00:00.000Z',
      materiality: 'scope_change',
      answerVisibility: 'all_eligible',
      attachments: [attachment('new-noise-profile')],
      amendmentLinked: false,
      extendsDeadline: false,
      identityReferences: [],
    },
  ],
});

const anonymousLeakChallenge = withRoot({
  challengeId: 'challenge-materials-2026',
  title: 'Materials synthesis route optimization',
  anonymousParticipation: true,
  answerSlaHours: 48,
  teams,
  clarifications: [
    {
      id: 'qa-leak',
      requestedByTeamId: 'team-gamma',
      requestedAt: '2026-05-18T06:00:00.000Z',
      answeredAt: '2026-05-18T09:00:00.000Z',
      materiality: 'material',
      answerVisibility: 'all_eligible',
      attachments: [attachment('solver-question-summary')],
      identityReferences: ['team-gamma'],
    },
  ],
});

const overdueChallenge = withRoot({
  challengeId: 'challenge-drug-screen-2026',
  title: 'Drug screen assay deconvolution',
  anonymousParticipation: true,
  answerSlaHours: 24,
  teams,
  clarifications: [
    {
      id: 'qa-overdue',
      requestedByTeamId: 'team-alpha',
      requestedAt: '2026-05-18T00:00:00.000Z',
      materiality: 'material',
      answerVisibility: null,
      attachments: [],
      identityReferences: [],
    },
  ],
});

const lateButBroadcastChallenge = withRoot({
  challengeId: 'challenge-protein-2026',
  title: 'Protein folding validation',
  anonymousParticipation: true,
  answerSlaHours: 24,
  teams,
  clarifications: [
    {
      id: 'qa-late',
      requestedByTeamId: 'team-beta',
      requestedAt: '2026-05-17T00:00:00.000Z',
      answeredAt: '2026-05-19T00:00:00.000Z',
      materiality: 'routine',
      answerVisibility: 'all_eligible',
      attachments: [attachment('late-readme-fix')],
      identityReferences: [],
    },
  ],
});

const register = {
  checkedAt: '2026-05-20T00:00:00.000Z',
  challenges: [
    cleanChallenge,
    lateButBroadcastChallenge,
    privateAnswerChallenge,
    anonymousLeakChallenge,
    scopeChangeChallenge,
    overdueChallenge,
  ],
};

const cleanRegister = {
  checkedAt: register.checkedAt,
  challenges: [cleanChallenge],
};

module.exports = {
  register,
  cleanRegister,
  cleanChallenge,
  lateButBroadcastChallenge,
  privateAnswerChallenge,
  scopeChangeChallenge,
  anonymousLeakChallenge,
  overdueChallenge,
};
