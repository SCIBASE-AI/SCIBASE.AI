const cleanReleasePacket = {
  challengeId: 'CH-BIO-EMBARGO-042',
  title: 'Single-cell biomarker challenge',
  releaseDate: '2026-06-15',
  visibility: 'public',
  sponsor: {
    name: 'Northstar Therapeutics',
    approval: {approved: true, approvedBy: 'sponsor-director', approvedAt: '2026-06-10'},
  },
  award: {
    winnerAnnouncement: true,
    winners: [
      {teamId: 'team-atlas', consentToPublicName: true, notifiedAt: '2026-06-11'},
      {teamId: 'team-orbit', consentToPublicName: true, notifiedAt: '2026-06-11'},
    ],
  },
  embargoes: [
    {id: 'embargo-1', type: 'sponsor-review', endsAt: '2026-06-10', releaseApproved: true},
  ],
  patentHolds: [
    {id: 'patent-1', status: 'cleared', docketId: 'US-2026-88421', counselApprovedAt: '2026-06-09'},
  ],
  publicationHolds: [
    {id: 'pub-1', status: 'cleared', manuscriptId: 'BIO-2026-119', clearedAt: '2026-06-08'},
  ],
  ndaRelease: {
    required: true,
    sponsorApproved: true,
    solverApprovals: [
      {teamId: 'team-atlas', approved: true},
      {teamId: 'team-orbit', approved: true},
    ],
  },
  funderPolicy: {
    openScienceDeadline: '2026-06-30',
    exceptionApproved: false,
  },
  artifacts: [
    {
      id: 'winner-summary',
      type: 'winner-announcement',
      visibility: 'public',
      redaction: 'complete',
      checksum: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      license: 'CC-BY-4.0',
    },
    {
      id: 'notebook-bundle',
      type: 'notebook',
      visibility: 'public',
      redaction: 'complete',
      checksum: 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      license: 'MIT',
    },
  ],
};

const blockedReleasePacket = {
  ...cleanReleasePacket,
  challengeId: 'CH-QUANTUM-HOLD-017',
  title: 'Quantum noise-reduction challenge',
  releaseDate: '2026-06-20',
  sponsor: {
    name: 'Qubit Forge',
    approval: {approved: false, approvedBy: '', approvedAt: ''},
  },
  award: {
    winnerAnnouncement: true,
    winners: [
      {teamId: 'team-photon', consentToPublicName: true, notifiedAt: '2026-06-15'},
      {teamId: 'team-hilbert', consentToPublicName: false, notifiedAt: ''},
    ],
  },
  embargoes: [
    {id: 'embargo-quantum-ip', type: 'patent-review', endsAt: '2026-07-15', releaseApproved: false},
  ],
  patentHolds: [
    {id: 'patent-qft-1', status: 'pending', docketId: '', counselApprovedAt: ''},
  ],
  publicationHolds: [
    {id: 'pub-qft-1', status: 'pending-journal-review', manuscriptId: 'QFT-2026-44', clearedAt: ''},
  ],
  ndaRelease: {
    required: true,
    sponsorApproved: false,
    solverApprovals: [
      {teamId: 'team-photon', approved: true},
      {teamId: 'team-hilbert', approved: false},
    ],
  },
  funderPolicy: {
    openScienceDeadline: '2026-06-18',
    exceptionApproved: false,
  },
  artifacts: [
    {
      id: 'winner-summary',
      type: 'winner-announcement',
      visibility: 'public',
      redaction: 'partial',
      checksum: 'sha256:not-valid',
      license: '',
    },
    {
      id: 'holdout-dataset',
      type: 'dataset',
      visibility: 'public',
      redaction: 'missing',
      checksum: '',
      license: '',
    },
  ],
};

module.exports = {
  cleanReleasePacket,
  blockedReleasePacket,
};
