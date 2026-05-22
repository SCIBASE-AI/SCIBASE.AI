const project = {
  asOfDate: "2026-05-22",
  contract: {
    customer: "Northbridge Research Consortium",
    renewalDate: "2026-06-01",
    allowedDomains: ["northbridge.edu", "nrc-labs.org"],
    inactivityReclaimDays: 90,
    seatEntitlements: {
      dashboard: 4,
      api: 2,
      viewer: 5
    },
    seatRates: {
      dashboard: 1200,
      api: 3200,
      viewer: 450
    }
  },
  approvals: {
    domainApprovals: [
      { domain: "nrc-labs.org", status: "approved", evidenceId: "addendum-2026-02" }
    ],
    overageApprovals: [],
    temporaryAccessApprovals: [
      { userId: "seat-009", status: "approved", expiresAt: "2026-06-15" }
    ]
  },
  roster: {
    users: [
      {
        id: "seat-001",
        email: "maya.chen@northbridge.edu",
        seatClass: "dashboard",
        status: "active",
        lastSeenAt: "2026-05-21"
      },
      {
        id: "seat-002",
        email: "omar.patel@northbridge.edu",
        seatClass: "dashboard",
        status: "active",
        lastSeenAt: "2026-05-17"
      },
      {
        id: "seat-003",
        email: "liam.gray@northbridge.edu",
        seatClass: "dashboard",
        status: "active",
        lastSeenAt: "2025-12-18"
      },
      {
        id: "seat-004",
        email: "grant.ops@northbridge.edu",
        seatClass: "dashboard",
        status: "active",
        lastSeenAt: "2026-05-12"
      },
      {
        id: "seat-005",
        email: "visiting.pi@partner-lab.com",
        seatClass: "dashboard",
        status: "active",
        temporaryUntil: "2026-04-30",
        lastSeenAt: "2026-05-20"
      },
      {
        id: "seat-006",
        email: "data-api@nrc-labs.org",
        seatClass: "api",
        status: "active",
        lastSeenAt: "2026-05-22"
      },
      {
        id: "seat-007",
        email: "policy-api@northbridge.edu",
        seatClass: "viewer",
        status: "active",
        lastSeenAt: "2026-05-19"
      },
      {
        id: "seat-008",
        email: "archive-api@nrc-labs.org",
        seatClass: "api",
        status: "active",
        lastSeenAt: "2026-05-18"
      },
      {
        id: "seat-009",
        email: "reviewer.temp@northbridge.edu",
        seatClass: "viewer",
        status: "active",
        temporaryUntil: "2026-06-10",
        lastSeenAt: "2026-05-16"
      },
      {
        id: "seat-010",
        email: "maya.chen@northbridge.edu",
        seatClass: "viewer",
        status: "active",
        lastSeenAt: "2026-05-20"
      }
    ]
  },
  usage: {
    byUser: {
      "seat-001": { dashboardSessions: 14, apiQueries: 0 },
      "seat-002": { dashboardSessions: 8, apiQueries: 0 },
      "seat-003": { dashboardSessions: 0, apiQueries: 0 },
      "seat-004": { dashboardSessions: 6, apiQueries: 0 },
      "seat-005": { dashboardSessions: 2, apiQueries: 0 },
      "seat-006": { dashboardSessions: 1, apiQueries: 4200 },
      "seat-007": { dashboardSessions: 3, apiQueries: 1300 },
      "seat-008": { dashboardSessions: 1, apiQueries: 900 },
      "seat-009": { dashboardSessions: 2, apiQueries: 0 },
      "seat-010": { dashboardSessions: 1, apiQueries: 0 }
    }
  }
};

module.exports = { project };
