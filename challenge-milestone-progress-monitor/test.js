const assert = require("assert");

const {
  auditChallengeMilestones,
  buildProgressSummary,
  createAuditDigest,
} = require("./index");

const generatedAt = "2026-05-20T12:00:00.000Z";

const challenge = {
  challengeId: "SCI-BIO-42",
  title: "Biomarker discovery challenge",
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
  ],
};

const submissions = [
  {
    teamId: "team-aurora",
    teamName: "Aurora Lab",
    currentMilestoneId: "prototype",
    lastSolverActivityAt: "2026-05-14T04:00:00.000Z",
    evidence: [
      { type: "prototype-notebook", artifactId: "nb-001" },
    ],
    sponsorFeedback: [
      {
        milestoneId: "prototype",
        requestedAt: "2026-05-17T06:00:00.000Z",
        respondedAt: null,
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
      { type: "prototype-notebook", artifactId: "nb-200" },
      { type: "validation-report", artifactId: "vr-200" },
      { type: "artifact-manifest", artifactId: "am-200" },
    ],
    sponsorFeedback: [
      {
        milestoneId: "prototype",
        requestedAt: "2026-05-19T09:00:00.000Z",
        respondedAt: "2026-05-19T16:00:00.000Z",
      },
    ],
    resubmissions: [],
    reviewerPacket: {
      milestoneId: "prototype",
      items: ["artifact-manifest", "rubric-alignment", "reproduction-notes"],
    },
  },
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("flags stalled milestone packets and routes concrete actions", () => {
  const audit = auditChallengeMilestones({ challenge, submissions, generatedAt });
  const packet = audit.packets.find((item) => item.teamId === "team-aurora");

  assert(packet, "expected packet for team-aurora");
  assert.strictEqual(packet.decision, "hold_for_escalation");
  assert.deepStrictEqual(packet.missingEvidence, [
    "validation-report",
    "artifact-manifest",
  ]);
  assert(packet.flags.includes("MISSING_MILESTONE_EVIDENCE"));
  assert(packet.flags.includes("SPONSOR_FEEDBACK_OVERDUE"));
  assert(packet.flags.includes("SOLVER_IDLE_RISK"));
  assert(packet.flags.includes("RESUBMISSION_WINDOW_EXPIRED"));
  assert(packet.flags.includes("REVIEW_PACKET_INCOMPLETE"));
  assert(packet.sponsorActions.some((action) => action.includes("overdue sponsor feedback")));
  assert(packet.solverActions.some((action) => action.includes("validation-report")));
  assert(packet.reviewerTasks.some((task) => task.includes("artifact-manifest")));
  assert(packet.riskScore >= 10);
});

test("marks complete milestone packets ready for review", () => {
  const audit = auditChallengeMilestones({ challenge, submissions, generatedAt });
  const packet = audit.packets.find((item) => item.teamId === "team-nova");

  assert(packet, "expected packet for team-nova");
  assert.strictEqual(packet.decision, "ready_for_review");
  assert.deepStrictEqual(packet.flags, []);
  assert.deepStrictEqual(packet.missingEvidence, []);
  assert.strictEqual(packet.riskScore, 0);
  assert(packet.reviewerTasks.includes("Route complete milestone packet to reviewers"));
});

test("builds a deterministic sponsor-facing progress summary", () => {
  const audit = auditChallengeMilestones({ challenge, submissions, generatedAt });
  const summary = buildProgressSummary(audit);

  assert.deepStrictEqual(summary.counts, {
    totalTeams: 2,
    readyForReview: 1,
    needsSolverAction: 0,
    escalations: 1,
    highRisk: 1,
  });
  assert.deepStrictEqual(summary.nextActions, [
    "Resolve 1 escalation packet before arbitration.",
    "Review 1 complete milestone packet.",
  ]);
});

test("creates stable audit digests from packet facts", () => {
  const audit = auditChallengeMilestones({ challenge, submissions, generatedAt });
  const packet = audit.packets.find((item) => item.teamId === "team-aurora");

  const first = createAuditDigest(packet);
  const second = createAuditDigest({ ...packet, sponsorActions: [...packet.sponsorActions] });

  assert.strictEqual(first, second);
  assert.match(first, /^cmpm_[a-f0-9]{24}$/);
});
