const supportPacket = {
  program: {
    id: 'rev-support-2026',
    name: 'Revenue infrastructure premium support routing',
  },
  generatedAt: '2026-05-31T07:55:00Z',
  policy: {
    unpaidBalanceHoldThreshold: 100,
    supportOverageRate: 4.25,
  },
  cases: [
    {
      id: 'case-enterprise-p1-clean',
      account: {
        id: 'acct-oxford-enterprise',
        plan: 'institution-enterprise',
        supportAddOn: true,
        supportRoster: ['admin-001', 'pi-022'],
      },
      request: {
        requesterId: 'admin-001',
        requesterRole: 'institution-admin',
        severity: 'p1',
        priorityRequested: true,
        requestedResponseMinutes: 30,
        estimatedMinutes: 45,
        enterpriseEscalation: true,
        escalationApprovalId: 'esc-7781',
      },
      finance: {
        unpaidBalance: 0,
        supportMinutesUsed: 120,
        supportMinutesIncluded: 600,
        overageApproved: false,
      },
      data: {
        classification: 'restricted-human-data',
        secureRoutingApproved: true,
      },
    },
    {
      id: 'case-lab-unpaid-priority',
      account: {
        id: 'acct-small-lab',
        plan: 'individual-pro',
        supportAddOn: false,
        supportRoster: ['owner-010'],
      },
      request: {
        requesterId: 'postdoc-177',
        requesterRole: 'researcher',
        severity: 'p1',
        priorityRequested: true,
        requestedResponseMinutes: 45,
        estimatedMinutes: 80,
        enterpriseEscalation: false,
      },
      finance: {
        unpaidBalance: 275,
        supportMinutesUsed: 0,
        supportMinutesIncluded: 0,
        overageApproved: false,
      },
      data: {
        classification: 'public',
        secureRoutingApproved: true,
      },
    },
    {
      id: 'case-lab-overage-approved',
      account: {
        id: 'acct-neuro-lab',
        plan: 'lab-plus',
        supportAddOn: true,
        supportRoster: ['pi-200', 'lab-admin-4'],
      },
      request: {
        requesterId: 'pi-200',
        requesterRole: 'lab-owner',
        severity: 'p2',
        priorityRequested: true,
        requestedResponseMinutes: 240,
        estimatedMinutes: 160,
        enterpriseEscalation: false,
      },
      finance: {
        unpaidBalance: 0,
        supportMinutesUsed: 520,
        supportMinutesIncluded: 600,
        overageApproved: true,
      },
      data: {
        classification: 'private-project',
        secureRoutingApproved: true,
      },
    },
    {
      id: 'case-government-sensitive-hold',
      account: {
        id: 'acct-gov-health',
        plan: 'government-enterprise',
        supportAddOn: true,
        supportRoster: ['agency-admin'],
      },
      request: {
        requesterId: 'agency-admin',
        requesterRole: 'institution-admin',
        severity: 'p1',
        priorityRequested: true,
        requestedResponseMinutes: 15,
        estimatedMinutes: 90,
        enterpriseEscalation: true,
      },
      finance: {
        unpaidBalance: 0,
        supportMinutesUsed: 210,
        supportMinutesIncluded: 900,
        overageApproved: false,
      },
      data: {
        classification: 'export-controlled',
        secureRoutingApproved: false,
      },
    },
  ],
};

const cleanPacket = {
  ...supportPacket,
  cases: [
    {
      id: 'case-clean-standard',
      account: {
        id: 'acct-basic',
        plan: 'individual-pro',
        supportAddOn: false,
        supportRoster: ['owner-1'],
      },
      request: {
        requesterId: 'owner-1',
        requesterRole: 'owner',
        severity: 'p3',
        priorityRequested: false,
        requestedResponseMinutes: 2880,
        estimatedMinutes: 20,
      },
      finance: {
        unpaidBalance: 0,
        supportMinutesUsed: 0,
        supportMinutesIncluded: 60,
        overageApproved: false,
      },
      data: {
        classification: 'public',
        secureRoutingApproved: true,
      },
    },
  ],
};

module.exports = { cleanPacket, supportPacket };
