const challenges = [
  {
    id: "climate-catalyst-forecast",
    title: "Regional Climate Catalyst Forecast",
    originalDeadline: "2026-06-01T17:00:00Z",
    currentDeadline: "2026-06-04T17:00:00Z",
    noticeSlaMinutes: 60,
    teams: [
      { id: "atlas-lab", name: "Atlas Lab", eligible: true },
      { id: "helix-models", name: "Helix Models", eligible: true },
      { id: "northstar-ai", name: "Northstar AI", eligible: true },
    ],
    extensionEvents: [
      {
        id: "ext-001",
        requestedBy: "sponsor:climate-nonprofit",
        approvedBy: "arbiter:public-review",
        approvedAt: "2026-05-31T18:15:00Z",
        publishedAt: "2026-05-31T18:30:00Z",
        reason: "Hosted benchmark outage affected all solvers.",
        scope: "all-eligible-teams",
        newDeadline: "2026-06-04T17:00:00Z",
        notices: [
          { teamId: "atlas-lab", notifiedAt: "2026-05-31T18:35:00Z", visibleDeadline: "2026-06-04T17:00:00Z" },
          { teamId: "helix-models", notifiedAt: "2026-05-31T18:36:00Z", visibleDeadline: "2026-06-04T17:00:00Z" },
          { teamId: "northstar-ai", notifiedAt: "2026-05-31T18:37:00Z", visibleDeadline: "2026-06-04T17:00:00Z" },
        ],
      },
    ],
    freezeWindow: {
      originalSnapshotHash: "sha256:91c4e3f4a6b7",
      reopenedAt: "2026-05-31T18:45:00Z",
      reopenedSnapshotHash: "sha256:22bd84f02ff3",
    },
    submissions: [
      { id: "sub-atlas", teamId: "atlas-lab", submittedAt: "2026-06-01T16:24:00Z", status: "accepted" },
      { id: "sub-helix", teamId: "helix-models", submittedAt: "2026-06-02T14:12:00Z", status: "accepted" },
      { id: "sub-northstar", teamId: "northstar-ai", submittedAt: "2026-06-04T16:45:00Z", status: "accepted" },
    ],
  },
  {
    id: "single-cell-biomarker-race",
    title: "Single-cell Biomarker Race",
    originalDeadline: "2026-06-02T18:00:00Z",
    currentDeadline: "2026-06-03T18:00:00Z",
    noticeSlaMinutes: 45,
    teams: [
      { id: "atlas-lab", name: "Atlas Lab", eligible: true },
      { id: "helix-models", name: "Helix Models", eligible: true },
      { id: "cobalt-bio", name: "Cobalt Bio", eligible: true },
    ],
    extensionEvents: [
      {
        id: "ext-private-helix",
        requestedBy: "team:helix-models",
        approvedBy: "sponsor:biotech-inc",
        approvedAt: "2026-06-02T19:30:00Z",
        publishedAt: "2026-06-02T20:15:00Z",
        reason: "Sponsor accepted one late upload after a private support thread.",
        scope: "single-team",
        teamId: "helix-models",
        newDeadline: "2026-06-03T18:00:00Z",
        notices: [
          { teamId: "helix-models", notifiedAt: "2026-06-02T20:17:00Z", visibleDeadline: "2026-06-03T18:00:00Z" },
          { teamId: "cobalt-bio", notifiedAt: "2026-06-03T08:20:00Z", visibleDeadline: "2026-06-03T18:00:00Z" },
        ],
      },
    ],
    freezeWindow: {
      originalSnapshotHash: "sha256:c0ffeeaa1111",
    },
    submissions: [
      { id: "sub-atlas", teamId: "atlas-lab", submittedAt: "2026-06-02T17:58:00Z", status: "accepted" },
      { id: "sub-helix", teamId: "helix-models", submittedAt: "2026-06-03T12:03:00Z", status: "accepted" },
      { id: "sub-cobalt", teamId: "cobalt-bio", submittedAt: "2026-06-03T19:04:00Z", status: "accepted" },
    ],
  },
  {
    id: "quantum-noise-cutoff",
    title: "Quantum Noise Reduction Sprint",
    originalDeadline: "2026-06-05T23:59:00Z",
    currentDeadline: "2026-06-05T23:59:00Z",
    noticeSlaMinutes: 30,
    teams: [
      { id: "qubit-north", name: "Qubit North", eligible: true },
      { id: "phase-labs", name: "Phase Labs", eligible: true },
    ],
    extensionEvents: [],
    freezeWindow: {
      originalSnapshotHash: "sha256:90210aabbccd",
    },
    submissions: [
      { id: "sub-qubit", teamId: "qubit-north", submittedAt: "2026-06-05T23:50:00Z", status: "accepted" },
      { id: "sub-phase", teamId: "phase-labs", submittedAt: "2026-06-06T00:12:00Z", status: "pending" },
    ],
  },
  {
    id: "materials-ambiguous-cutoff",
    title: "Materials Discovery Prototype",
    originalDeadline: "2026-06-07 17:00",
    currentDeadline: "2026-06-08 17:00",
    noticeSlaMinutes: 60,
    teams: [
      { id: "lattice-lab", name: "Lattice Lab", eligible: true },
      { id: "polymer-scouts", name: "Polymer Scouts", eligible: true },
    ],
    extensionEvents: [
      {
        id: "ext-ambiguous-time",
        requestedBy: "sponsor:materials-co",
        approvedBy: "arbiter:challenge-admin",
        approvedAt: "2026-06-06T15:00:00Z",
        publishedAt: "2026-06-06T15:30:00Z",
        reason: "Sponsor changed uploaded dataset.",
        scope: "all-eligible-teams",
        newDeadline: "2026-06-08 17:00",
        notices: [
          { teamId: "lattice-lab", notifiedAt: "2026-06-06T15:35:00Z", visibleDeadline: "2026-06-08 17:00" },
          { teamId: "polymer-scouts", notifiedAt: "2026-06-06T16:40:00Z", visibleDeadline: "2026-06-08 17:00" },
        ],
      },
    ],
    freezeWindow: {
      originalSnapshotHash: "sha256:7e57edddd123",
      reopenedAt: "2026-06-06T15:40:00Z",
      reopenedSnapshotHash: "sha256:8a8d9000eeee",
    },
    submissions: [
      { id: "sub-lattice", teamId: "lattice-lab", submittedAt: "2026-06-08T16:30:00Z", status: "accepted" },
      { id: "sub-polymer", teamId: "polymer-scouts", submittedAt: "2026-06-08T16:55:00Z", status: "accepted" },
    ],
  },
];

module.exports = {
  challenges,
};
