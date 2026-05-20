const challenge = {
  challengeId: "SCI-BIO-42",
  title: "Biomarker discovery challenge",
  sponsor: "Northstar Therapeutics",
  feedbackSlaHours: 48,
  idleRiskHours: 96,
  milestones: [
    {
      id: "prototype",
      label: "Prototype package",
      dueAt: "2026-05-18T12:00:00.000Z",
      resubmissionHours: 72,
      requiredEvidence: [
        "prototype-notebook",
        "validation-report",
        "artifact-manifest",
      ],
      reviewerPacketRequirements: [
        "artifact-manifest",
        "rubric-alignment",
        "reproduction-notes",
      ],
    },
    {
      id: "final",
      label: "Final replication packet",
      dueAt: "2026-06-10T12:00:00.000Z",
      resubmissionHours: 96,
      requiredEvidence: [
        "locked-model-card",
        "independent-replication",
        "whitepaper",
      ],
      reviewerPacketRequirements: [
        "locked-model-card",
        "replication-log",
        "sponsor-feedback",
      ],
    },
  ],
};

const submissions = [
  {
    teamId: "team-aurora",
    teamName: "Aurora Lab",
    currentMilestoneId: "prototype",
    lastSolverActivityAt: "2026-05-14T04:00:00.000Z",
    evidence: [
      { type: "prototype-notebook", artifactId: "nb-001", hash: "sha256:08b2" },
    ],
    sponsorFeedback: [
      {
        milestoneId: "prototype",
        requestedAt: "2026-05-17T06:00:00.000Z",
        respondedAt: null,
        topic: "Validation cohort mismatch",
      },
    ],
    resubmissions: [
      {
        milestoneId: "prototype",
        openedAt: "2026-05-16T00:00:00.000Z",
        submittedAt: null,
      },
    ],
    reviewerPacket: {
      milestoneId: "prototype",
      items: ["rubric-alignment"],
    },
  },
  {
    teamId: "team-nova",
    teamName: "Nova Institute",
    currentMilestoneId: "prototype",
    lastSolverActivityAt: "2026-05-20T08:00:00.000Z",
    evidence: [
      { type: "prototype-notebook", artifactId: "nb-200", hash: "sha256:1a2b" },
      { type: "validation-report", artifactId: "vr-200", hash: "sha256:1a2c" },
      { type: "artifact-manifest", artifactId: "am-200", hash: "sha256:1a2d" },
    ],
    sponsorFeedback: [
      {
        milestoneId: "prototype",
        requestedAt: "2026-05-19T09:00:00.000Z",
        respondedAt: "2026-05-19T16:00:00.000Z",
        topic: "Assay controls",
      },
    ],
    resubmissions: [],
    reviewerPacket: {
      milestoneId: "prototype",
      items: ["artifact-manifest", "rubric-alignment", "reproduction-notes"],
    },
  },
  {
    teamId: "team-quasar",
    teamName: "Quasar Students",
    currentMilestoneId: "final",
    lastSolverActivityAt: "2026-05-19T18:00:00.000Z",
    evidence: [
      { type: "locked-model-card", artifactId: "mc-441", hash: "sha256:44aa" },
      { type: "whitepaper", artifactId: "wp-441", hash: "sha256:44ab" },
    ],
    sponsorFeedback: [],
    resubmissions: [],
    reviewerPacket: {
      milestoneId: "final",
      items: ["locked-model-card"],
    },
  },
];

module.exports = { challenge, submissions };
