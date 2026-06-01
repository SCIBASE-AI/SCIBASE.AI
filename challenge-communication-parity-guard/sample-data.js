const completeChallenge = {
  challengeId: "sb-comm-001",
  title: "Protein binder design bounty",
  currentRuleDigest: "rules-v4-a8f9",
  clockStartsAt: "2026-06-05T16:00:00Z",
  teams: [
    {
      id: "team-alpha",
      status: "eligible",
      timezone: "America/Mexico_City",
      channels: ["portal", "email"],
      accessibilityNeeds: ["captions"],
    },
    {
      id: "team-beta",
      status: "eligible",
      timezone: "Europe/Berlin",
      channels: ["portal", "email"],
      accessibilityNeeds: [],
    },
    {
      id: "team-gamma",
      status: "eligible",
      timezone: "Asia/Tokyo",
      channels: ["portal", "email"],
      accessibilityNeeds: ["screen-reader"],
    },
  ],
  communications: [
    {
      id: "comm-001",
      phase: "submission",
      material: true,
      topic: "benchmark clarification",
      sentAt: "2026-06-02T16:00:00Z",
      audience: ["team-alpha", "team-beta", "team-gamma"],
      channels: ["portal", "email"],
      ruleDigest: "rules-v4-a8f9",
      ackDeadlineHours: 36,
      acknowledgements: {
        "team-alpha": "2026-06-02T17:00:00Z",
        "team-beta": "2026-06-02T17:10:00Z",
        "team-gamma": "2026-06-02T17:20:00Z",
      },
      attachments: [
        {
          id: "benchmark-notes",
          required: true,
          accessibleFormats: ["html", "captions", "screen-reader"],
          digest: "sha256-aaa111",
        },
      ],
    },
    {
      id: "comm-002",
      phase: "scoring",
      material: false,
      topic: "office hours reminder",
      sentAt: "2026-06-03T15:00:00Z",
      audience: ["team-alpha", "team-beta", "team-gamma"],
      channels: ["portal"],
      ruleDigest: "rules-v4-a8f9",
      ackDeadlineHours: 24,
      acknowledgements: {},
      attachments: [],
    },
  ],
};

const riskyChallenge = {
  ...completeChallenge,
  challengeId: "sb-comm-002",
  communications: [
    {
      id: "comm-101",
      phase: "submission",
      material: true,
      topic: "sponsor hint about hidden holdout metric",
      sentAt: "2026-06-02T22:30:00Z",
      audience: ["team-alpha"],
      channels: ["email"],
      ruleDigest: "rules-v3-legacy",
      ackDeadlineHours: 8,
      acknowledgements: {
        "team-alpha": "2026-06-02T23:00:00Z",
      },
      attachments: [
        {
          id: "holdout-hint",
          required: true,
          accessibleFormats: ["pdf"],
          digest: "sha256-bbb222",
        },
      ],
    },
    {
      id: "comm-102",
      phase: "payout",
      material: true,
      topic: "award settlement instructions",
      sentAt: "2026-06-04T13:00:00Z",
      audience: ["team-alpha", "team-beta"],
      channels: ["portal"],
      ruleDigest: "rules-v4-a8f9",
      ackDeadlineHours: 18,
      acknowledgements: {
        "team-alpha": "2026-06-04T13:30:00Z",
      },
      attachments: [],
    },
  ],
};

module.exports = {
  completeChallenge,
  riskyChallenge,
};
