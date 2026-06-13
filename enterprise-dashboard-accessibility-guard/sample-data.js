const blockedDashboard = {
  dashboardId: 'enterprise-admin-overview',
  institutionId: 'institution-redacted',
  assessedAt: '2026-05-27T13:00:00Z',
  widgets: [
    {
      id: 'compute-usage-critical',
      type: 'metric',
      title: 'Compute usage',
      foreground: '#64748b',
      background: '#f8fafc',
      critical: true,
      keyboardReachable: true,
      focusVisible: false,
      screenReaderLabel: 'Compute usage for private lab alice@example.edu',
      ariaTextContainsPrivateData: true,
      headingLevel: 2
    },
    {
      id: 'contract-risk-score',
      type: 'metric',
      title: 'Contract risk score',
      foreground: 'var(--metric-danger)',
      background: '#ffffff',
      critical: true,
      keyboardReachable: true,
      screenReaderLabel: 'Contract risk score across departments',
      headingLevel: 2
    },
    {
      id: 'private-project-table',
      type: 'table',
      title: 'Private projects',
      foreground: '#111827',
      background: '#ffffff',
      critical: true,
      keyboardReachable: false,
      focusTrap: true,
      screenReaderLabel: '',
      tableSummary: '',
      headingLevel: 4
    }
  ],
  alerts: [
    {
      id: 'webhook-failure-alert',
      title: 'Webhook delivery failed',
      foreground: '#ef4444',
      background: '#fee2e2',
      critical: true,
      keyboardReachable: true,
      screenReaderLabel: 'Webhook delivery failed',
      headingLevel: 3
    }
  ],
  exports: [
    {
      id: 'weekly-admin-export',
      format: 'csv',
      tableSummary: '',
      screenReaderLabel: 'Weekly admin export'
    }
  ],
  motion: {
    animatedCharts: ['compute-usage-critical'],
    reducedMotionFallback: false
  }
};

const cleanDashboard = {
  dashboardId: 'enterprise-admin-clean',
  institutionId: 'institution-redacted',
  assessedAt: '2026-05-27T13:00:00Z',
  widgets: [
    {
      id: 'open-access-compliance',
      type: 'metric',
      title: 'Open access compliance',
      foreground: '#0f172a',
      background: '#ffffff',
      critical: true,
      keyboardReachable: true,
      screenReaderLabel: 'Open access compliance percentage across hosted projects',
      headingLevel: 2
    },
    {
      id: 'lab-output-table',
      type: 'table',
      title: 'Lab output',
      foreground: '#0f172a',
      background: '#f8fafc',
      critical: false,
      keyboardReachable: true,
      screenReaderLabel: 'Research output by lab',
      tableSummary: 'Rows list labs; columns show projects, reviews, storage, and reproducibility score.',
      headingLevel: 3
    }
  ],
  alerts: [
    {
      id: 'repo-sync-alert',
      title: 'Repository sync complete',
      foreground: '#14532d',
      background: '#dcfce7',
      critical: false,
      keyboardReachable: true,
      screenReaderLabel: 'Repository sync complete',
      headingLevel: 3
    }
  ],
  exports: [
    {
      id: 'quarterly-accessibility-export',
      format: 'json',
      tableSummary: 'Export includes aggregate accessibility status only.',
      screenReaderLabel: 'Quarterly accessibility readiness export'
    }
  ],
  motion: {
    animatedCharts: ['open-access-compliance'],
    reducedMotionFallback: true
  }
};

const warningDashboard = {
  dashboardId: 'enterprise-admin-motion-warning',
  institutionId: 'institution-redacted',
  assessedAt: '2026-05-27T13:00:00Z',
  widgets: [
    {
      id: 'research-output-trend',
      type: 'metric',
      title: 'Research output trend',
      foreground: '#172554',
      background: '#dbeafe',
      critical: false,
      keyboardReachable: true,
      screenReaderLabel: 'Research output trend for all departments',
      headingLevel: 2
    }
  ],
  alerts: [],
  exports: [
    {
      id: 'trend-export',
      format: 'json',
      tableSummary: 'Trend export contains aggregate department counts only.',
      screenReaderLabel: 'Research output trend export'
    }
  ],
  motion: {
    animatedCharts: ['research-output-trend'],
    reducedMotionFallback: false
  }
};

const missingContrastDashboard = {
  dashboardId: 'enterprise-admin-missing-contrast-evidence',
  institutionId: 'institution-redacted',
  assessedAt: '2026-05-27T13:17:00Z',
  widgets: [
    {
      id: 'contract-risk-without-colors',
      type: 'metric',
      title: 'Contract risk score',
      critical: true,
      keyboardReachable: true,
      screenReaderLabel: 'Contract risk score across departments',
      headingLevel: 2
    }
  ],
  alerts: [],
  exports: [],
  motion: {
    animatedCharts: [],
    reducedMotionFallback: true
  }
};

const missingNoncriticalContrastDashboard = {
  dashboardId: 'enterprise-admin-missing-secondary-contrast',
  institutionId: 'institution-redacted',
  assessedAt: '2026-05-30T15:25:00Z',
  widgets: [
    {
      id: 'secondary-usage-trend-without-colors',
      type: 'metric',
      title: 'Storage usage trend',
      critical: false,
      keyboardReachable: true,
      screenReaderLabel: 'Storage usage trend across departments',
      headingLevel: 2
    }
  ],
  alerts: [],
  exports: [],
  motion: {
    animatedCharts: [],
    reducedMotionFallback: true
  }
};

const malformedComponentDashboard = {
  dashboardId: 'enterprise-admin-malformed-component',
  institutionId: 'institution-redacted',
  assessedAt: '2026-05-31T14:30:00Z',
  widgets: [null],
  alerts: [],
  exports: [],
  motion: {
    animatedCharts: [],
    reducedMotionFallback: true
  }
};

const malformedDashboardPacket = null;

const malformedMotionDashboard = {
  dashboardId: 'enterprise-admin-malformed-motion',
  institutionId: 'institution-redacted',
  assessedAt: '2026-06-10T13:10:00Z',
  widgets: [
    {
      id: 'animated-usage-trend',
      type: 'metric',
      title: 'Usage trend',
      foreground: '#111827',
      background: '#ffffff',
      critical: false,
      keyboardReachable: true,
      screenReaderLabel: 'Usage trend across departments',
      headingLevel: 2
    }
  ],
  alerts: [],
  exports: [],
  motion: {
    animatedCharts: 'animated-usage-trend',
    reducedMotionFallback: false
  }
};

module.exports = {
  blockedDashboard,
  cleanDashboard,
  warningDashboard,
  missingContrastDashboard,
  missingNoncriticalContrastDashboard,
  malformedComponentDashboard,
  malformedDashboardPacket,
  malformedMotionDashboard
};
