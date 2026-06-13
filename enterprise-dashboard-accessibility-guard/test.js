const assert = require('assert');

const { assessDashboardRelease } = require('./index');
const { blockedDashboard, cleanDashboard, warningDashboard } = require('./sample-data');

function codes(packet) {
  return packet.findings.map((finding) => finding.code).sort();
}

function testCriticalAccessibilityIssuesBlockDashboardRelease() {
  const packet = assessDashboardRelease(blockedDashboard);
  const findingCodes = codes(packet);

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.equal(packet.releaseLanes.scheduledExport, 'blocked');
  assert.equal(packet.releaseLanes.webhookNotice, 'blocked');
  assert.ok(findingCodes.includes('LOW_CONTRAST_CRITICAL_METRIC'));
  assert.ok(findingCodes.includes('MISSING_SCREEN_READER_LABEL'));
  assert.ok(findingCodes.includes('KEYBOARD_TRAP'));
  assert.ok(findingCodes.includes('PRIVATE_DATA_IN_ACCESSIBILITY_TEXT'));
  assert.ok(findingCodes.includes('MISSING_TABLE_SUMMARY'));
  assert.ok(packet.actions.includes('block_release:enterprise-admin-overview'));
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

function testCleanDashboardReleasesWithWcagSignals() {
  const packet = assessDashboardRelease(cleanDashboard);

  assert.equal(packet.status, 'release_with_accessibility_monitoring');
  assert.equal(packet.releaseLanes.adminDashboard, 'allowed');
  assert.equal(packet.releaseLanes.scheduledExport, 'allowed');
  assert.equal(packet.releaseLanes.webhookNotice, 'allowed');
  assert.deepEqual(packet.findings, []);
  assert.equal(packet.wcagSignals.perceivable, true);
  assert.equal(packet.wcagSignals.operable, true);
  assert.equal(packet.wcagSignals.understandable, true);
  assert.equal(packet.wcagSignals.robust, true);
}

function testWarningsAllowInternalOnlyPreview() {
  const packet = assessDashboardRelease(warningDashboard);

  assert.equal(packet.status, 'remediate_before_public_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'internal_only');
  assert.equal(packet.releaseLanes.scheduledExport, 'blocked');
  assert.equal(packet.releaseLanes.webhookNotice, 'internal_only');
  assert.deepEqual(codes(packet), ['MISSING_REDUCED_MOTION_FALLBACK']);
  assert.ok(packet.actions.includes('add_reduced_motion_fallback:research-output-trend'));
}

function testNonCriticalLowContrastRequiresRemediationBeforeRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-low-contrast-secondary',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:05:00Z',
    widgets: [
      {
        id: 'secondary-storage-trend',
        type: 'metric',
        title: 'Storage trend',
        foreground: '#94a3b8',
        background: '#f8fafc',
        critical: false,
        keyboardReachable: true,
        screenReaderLabel: 'Storage trend across departments',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'remediate_before_public_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'internal_only');
  assert.equal(packet.releaseLanes.scheduledExport, 'blocked');
  assert.deepEqual(codes(packet), ['LOW_CONTRAST_NONCRITICAL_METRIC']);
  assert.equal(packet.wcagSignals.perceivable, false);
  assert.ok(packet.actions.includes('improve_contrast:secondary-storage-trend'));
}

function testPrivateDataInTableSummaryBlocksRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-private-summary',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:10:00Z',
    widgets: [
      {
        id: 'private-summary-table',
        type: 'table',
        title: 'Project review',
        foreground: '#111827',
        background: '#ffffff',
        critical: true,
        keyboardReachable: true,
        screenReaderLabel: 'Project review table',
        tableSummary: 'Rows include restricted project alpha and private lab owner alice@example.edu.',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.ok(codes(packet).includes('PRIVATE_DATA_IN_ACCESSIBILITY_TEXT'));
  assert.equal(packet.wcagSignals.understandable, false);
  assert.ok(packet.actions.includes('redact_accessibility_text:private-summary-table'));
}

function testDirectIdentifierInScreenReaderLabelBlocksRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-private-label',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:12:00Z',
    widgets: [
      {
        id: 'private-label-metric',
        type: 'metric',
        title: 'Sensitive usage metric',
        foreground: '#111827',
        background: '#ffffff',
        critical: true,
        keyboardReachable: true,
        screenReaderLabel: 'Usage for ORCID:0000-0002-1825-0097',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.deepEqual(codes(packet), ['PRIVATE_DATA_IN_ACCESSIBILITY_TEXT']);
  assert.equal(packet.wcagSignals.understandable, false);
  assert.ok(packet.actions.includes('redact_accessibility_text:private-label-metric'));
}

function testInvalidContrastEvidenceBlocksRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-invalid-contrast-evidence',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:15:00Z',
    widgets: [
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
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['INVALID_CONTRAST_EVIDENCE']);
  assert.equal(packet.wcagSignals.perceivable, false);
  assert.ok(packet.actions.includes('provide_valid_contrast_evidence:contract-risk-score'));
}

function testMissingCriticalContrastEvidenceBlocksRelease() {
  const packet = assessDashboardRelease({
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
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['INVALID_CONTRAST_EVIDENCE']);
  assert.equal(packet.wcagSignals.perceivable, false);
  assert.ok(packet.actions.includes('provide_valid_contrast_evidence:contract-risk-without-colors'));
}

function testMissingNoncriticalContrastEvidenceRequiresRemediation() {
  const packet = assessDashboardRelease({
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
  });

  assert.equal(packet.status, 'remediate_before_public_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'internal_only');
  assert.equal(packet.releaseLanes.scheduledExport, 'blocked');
  assert.equal(packet.releaseLanes.webhookNotice, 'internal_only');
  assert.deepEqual(codes(packet), ['INVALID_CONTRAST_EVIDENCE']);
  assert.equal(packet.wcagSignals.perceivable, false);
  assert.ok(packet.actions.includes('provide_valid_contrast_evidence:secondary-usage-trend-without-colors'));
}

function testMalformedDashboardComponentEntriesBlockRelease() {
  const packet = assessDashboardRelease({
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
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['MALFORMED_DASHBOARD_COMPONENT_ENTRY']);
  assert.equal(packet.wcagSignals.robust, false);
  assert.ok(packet.actions.includes('repair_dashboard_component_evidence:widgets[0]'));
}

function testMalformedDashboardPacketBlocksRelease() {
  const packet = assessDashboardRelease(null);

  assert.equal(packet.dashboardId, 'unidentified-dashboard');
  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['MALFORMED_DASHBOARD_PACKET']);
  assert.equal(packet.wcagSignals.robust, false);
  assert.ok(packet.actions.includes('repair_dashboard_packet:unidentified-dashboard'));
}

function testMalformedMotionEvidenceBlocksRelease() {
  const packet = assessDashboardRelease({
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
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['MALFORMED_MOTION_EVIDENCE']);
  assert.equal(packet.wcagSignals.operable, false);
  assert.ok(packet.actions.includes('repair_motion_evidence:motion.animatedCharts'));
}

function testShorthandHexContrastEvidenceRemainsValid() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-shorthand-contrast',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:20:00Z',
    widgets: [
      {
        id: 'repository-sync-status',
        type: 'metric',
        title: 'Repository sync status',
        foreground: '#000',
        background: '#fff',
        critical: true,
        keyboardReachable: true,
        screenReaderLabel: 'Repository sync status across departments',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'release_with_accessibility_monitoring');
  assert.deepEqual(packet.findings, []);
  assert.equal(packet.wcagSignals.perceivable, true);
}

function testMissingVisibleFocusIndicatorBlocksKeyboardRelease() {
  const packet = assessDashboardRelease({
    dashboardId: 'enterprise-admin-hidden-focus',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:25:00Z',
    widgets: [
      {
        id: 'project-risk-filter',
        type: 'filter',
        title: 'Project risk filter',
        foreground: '#111827',
        background: '#ffffff',
        critical: true,
        keyboardReachable: true,
        focusVisible: false,
        screenReaderLabel: 'Filter projects by risk status',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.releaseLanes.adminDashboard, 'blocked');
  assert.deepEqual(codes(packet), ['MISSING_VISIBLE_FOCUS_INDICATOR']);
  assert.equal(packet.wcagSignals.operable, false);
  assert.ok(packet.actions.includes('add_visible_focus_indicator:project-risk-filter'));
}

function testPrivateComponentIdsAreRedactedFromFindingsAndActions() {
  const packet = assessDashboardRelease({
    dashboardId: 'C:\\Users\\Alice\\dashboards\\private-lab',
    institutionId: 'institution-redacted',
    assessedAt: '2026-05-27T13:25:00Z',
    widgets: [
      {
        id: 'alice.private@example.edu',
        type: 'metric',
        title: 'Private cohort summary',
        foreground: '#111827',
        background: '#ffffff',
        critical: true,
        keyboardReachable: true,
        screenReaderLabel: 'Owner alice.private@example.edu cohort summary',
        headingLevel: 2
      }
    ],
    alerts: [],
    exports: [],
    motion: {
      animatedCharts: [],
      reducedMotionFallback: true
    }
  });

  const packetJson = JSON.stringify(packet);

  assert.equal(packet.status, 'hold_accessibility_release');
  assert.equal(packet.findings[0].componentId, 'component-redacted-1');
  assert.ok(packet.actions.includes('block_release:dashboard-redacted'));
  assert.ok(packet.actions.includes('redact_accessibility_text:component-redacted-1'));
  assert.equal(packetJson.includes('alice.private@example.edu'), false);
  assert.equal(packetJson.includes('C:\\Users\\Alice'), false);
  assert.equal(packetJson.includes('private-lab'), false);
}

const tests = [
  testCriticalAccessibilityIssuesBlockDashboardRelease,
  testCleanDashboardReleasesWithWcagSignals,
  testWarningsAllowInternalOnlyPreview,
  testNonCriticalLowContrastRequiresRemediationBeforeRelease,
  testPrivateDataInTableSummaryBlocksRelease,
  testDirectIdentifierInScreenReaderLabelBlocksRelease,
  testInvalidContrastEvidenceBlocksRelease,
  testMissingCriticalContrastEvidenceBlocksRelease,
  testMissingNoncriticalContrastEvidenceRequiresRemediation,
  testMalformedDashboardComponentEntriesBlockRelease,
  testMalformedDashboardPacketBlocksRelease,
  testMalformedMotionEvidenceBlocksRelease,
  testShorthandHexContrastEvidenceRemainsValid,
  testMissingVisibleFocusIndicatorBlocksKeyboardRelease,
  testPrivateComponentIdsAreRedactedFromFindingsAndActions
];

for (const test of tests) {
  test();
}

console.log(`enterprise-dashboard-accessibility-guard tests passed (${tests.length})`);
