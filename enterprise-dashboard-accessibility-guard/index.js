const crypto = require('crypto');

function assessDashboardRelease(dashboard) {
  const normalized = normalizeDashboardPacket(dashboard);
  const findings = [
    ...normalized.findings,
    ...assessVisualAndOperableComponents(normalized.dashboard),
    ...assessMotion(normalized.dashboard)
  ];
  const safeComponentId = createComponentIdentifierSanitizer();
  const safeFindings = findings.map((finding) => ({
    ...finding,
    componentId: safeComponentId(finding.componentId)
  }));
  const safeDashboard = {
    ...normalized.dashboard,
    dashboardId: safeDashboardId(normalized.dashboard.dashboardId)
  };
  const blockerCount = findings.filter((finding) => finding.severity === 'blocker').length;
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length;

  const packet = {
    dashboardId: safeDashboard.dashboardId,
    institutionId: normalized.dashboard.institutionId,
    status: chooseStatus(blockerCount, warningCount),
    releaseLanes: chooseReleaseLanes(blockerCount, warningCount),
    findings: safeFindings,
    actions: buildActions(safeDashboard, safeFindings),
    wcagSignals: buildWcagSignals(safeFindings),
    assessedAt: normalized.dashboard.assessedAt
  };

  packet.auditDigest = digestPacket(packet);
  return packet;
}

function normalizeDashboardPacket(dashboard) {
  if (dashboard && typeof dashboard === 'object' && !Array.isArray(dashboard)) {
    return { dashboard, findings: [] };
  }

  const normalizedDashboard = {
    dashboardId: 'unidentified-dashboard',
    institutionId: 'unidentified-institution',
    assessedAt: null,
    widgets: [],
    alerts: [],
    exports: [],
    motion: {}
  };

  return {
    dashboard: normalizedDashboard,
    findings: [{
      componentId: normalizedDashboard.dashboardId,
      code: 'MALFORMED_DASHBOARD_PACKET',
      severity: 'blocker',
      message: 'Dashboard release evidence must be an object before accessibility assessment.'
    }]
  };
}

function assessVisualAndOperableComponents(dashboard) {
  const findings = [];
  const components = collectDashboardComponents(dashboard, findings);

  for (const component of components) {
    if (component.critical && (!component.foreground || !component.background)) {
      findings.push(finding(
        component,
        'INVALID_CONTRAST_EVIDENCE',
        'blocker',
        'Critical component color contrast evidence must include foreground and background hex values before dashboard release.'
      ));
    } else if (requiresContrastEvidence(component) && (!component.foreground || !component.background)) {
      findings.push(finding(
        component,
        'INVALID_CONTRAST_EVIDENCE',
        'warning',
        'Noncritical dashboard component contrast evidence should include foreground and background hex values before public release.'
      ));
    } else if (component.foreground && component.background) {
      const contrast = contrastRatio(component.foreground, component.background);
      if (contrast === null) {
        findings.push(finding(
          component,
          'INVALID_CONTRAST_EVIDENCE',
          'blocker',
          'Component color evidence must be parseable hex values before dashboard release.'
        ));
      } else if (component.critical && contrast < 4.5) {
        findings.push(finding(
          component,
          'LOW_CONTRAST_CRITICAL_METRIC',
          'blocker',
          `Critical component contrast is ${contrast.toFixed(2)}:1, below the 4.5:1 release threshold.`
        ));
      } else if (contrast < 4.5) {
        findings.push(finding(
          component,
          'LOW_CONTRAST_NONCRITICAL_METRIC',
          'warning',
          `Noncritical component contrast is ${contrast.toFixed(2)}:1, below the 4.5:1 readiness threshold.`
        ));
      }
    }

    if (!component.screenReaderLabel || !component.screenReaderLabel.trim()) {
      findings.push(finding(component, 'MISSING_SCREEN_READER_LABEL', 'blocker', 'Component lacks a meaningful screen-reader label.'));
    }

    if (component.keyboardReachable === false || component.focusTrap) {
      findings.push(finding(component, 'KEYBOARD_TRAP', 'blocker', 'Keyboard users cannot reach or leave this component predictably.'));
    }

    if (component.keyboardReachable !== false && component.focusVisible === false) {
      findings.push(finding(component, 'MISSING_VISIBLE_FOCUS_INDICATOR', 'blocker', 'Keyboard users need a visible focus indicator on reachable dashboard controls.'));
    }

    if (component.ariaTextContainsPrivateData || containsPrivateData(accessibilityText(component))) {
      findings.push(finding(component, 'PRIVATE_DATA_IN_ACCESSIBILITY_TEXT', 'blocker', 'Accessibility text exposes private user, lab, or project data.'));
    }

    if ((component.type === 'table' || component.format) && !component.tableSummary) {
      findings.push(finding(component, 'MISSING_TABLE_SUMMARY', 'blocker', 'Table or export output needs a concise nonvisual summary.'));
    }
  }

  findings.push(...assessHeadingOrder(components));
  return findings;
}

function collectDashboardComponents(dashboard, findings) {
  const groups = [
    ['widgets', dashboard.widgets],
    ['alerts', dashboard.alerts],
    ['exports', dashboard.exports]
  ];
  const components = [];

  for (const [groupName, group] of groups) {
    if (group == null) continue;
    if (!Array.isArray(group)) {
      findings.push({
        componentId: groupName,
        code: 'MALFORMED_DASHBOARD_COMPONENT_ENTRY',
        severity: 'blocker',
        message: `Dashboard ${groupName} evidence must be an array of component objects before release.`
      });
      continue;
    }

    group.forEach((component, index) => {
      if (!component || typeof component !== 'object' || Array.isArray(component)) {
        findings.push({
          componentId: `${groupName}[${index}]`,
          code: 'MALFORMED_DASHBOARD_COMPONENT_ENTRY',
          severity: 'blocker',
          message: 'Dashboard component evidence must be an object before accessibility release.'
        });
        return;
      }
      components.push(component);
    });
  }

  return components;
}

function requiresContrastEvidence(component) {
  return Boolean(component.type || component.title || component.foreground || component.background);
}

function assessHeadingOrder(components) {
  const findings = [];
  let previousLevel = null;

  for (const component of components.filter((item) => item.headingLevel)) {
    if (previousLevel !== null && component.headingLevel > previousLevel + 1) {
      findings.push(finding(component, 'HEADING_ORDER_SKIP', 'warning', 'Heading order skips a level and may confuse screen-reader navigation.'));
    }
    previousLevel = component.headingLevel;
  }

  return findings;
}

function assessMotion(dashboard) {
  const animatedCharts = dashboard.motion?.animatedCharts;
  if (animatedCharts == null) return [];
  if (!Array.isArray(animatedCharts) || animatedCharts.some((componentId) => typeof componentId !== 'string' || !componentId.trim())) {
    return [{
      componentId: 'motion.animatedCharts',
      code: 'MALFORMED_MOTION_EVIDENCE',
      severity: 'blocker',
      message: 'Dashboard motion evidence must list animated component IDs before reduced-motion release assessment.'
    }];
  }

  if (animatedCharts.length && !dashboard.motion.reducedMotionFallback) {
    return animatedCharts.map((componentId) => ({
      componentId,
      code: 'MISSING_REDUCED_MOTION_FALLBACK',
      severity: 'warning',
      message: 'Animated dashboard content needs a reduced-motion fallback before public release.'
    }));
  }
  return [];
}

function finding(component, code, severity, message) {
  return {
    componentId: component.id,
    code,
    severity,
    message
  };
}

function chooseStatus(blockerCount, warningCount) {
  if (blockerCount > 0) return 'hold_accessibility_release';
  if (warningCount > 0) return 'remediate_before_public_release';
  return 'release_with_accessibility_monitoring';
}

function chooseReleaseLanes(blockerCount, warningCount) {
  if (blockerCount > 0) {
    return {
      adminDashboard: 'blocked',
      scheduledExport: 'blocked',
      webhookNotice: 'blocked'
    };
  }
  if (warningCount > 0) {
    return {
      adminDashboard: 'internal_only',
      scheduledExport: 'blocked',
      webhookNotice: 'internal_only'
    };
  }
  return {
    adminDashboard: 'allowed',
    scheduledExport: 'allowed',
    webhookNotice: 'allowed'
  };
}

function buildActions(dashboard, findings) {
  if (!findings.length) return ['release_with_accessibility_monitoring'];

  const actions = new Set();
  const hasBlocker = findings.some((item) => item.severity === 'blocker');
  if (hasBlocker) actions.add(`block_release:${dashboard.dashboardId}`);

  for (const item of findings) {
    if (item.code === 'MISSING_REDUCED_MOTION_FALLBACK') {
      actions.add(`add_reduced_motion_fallback:${item.componentId}`);
    }
    if (item.code === 'MISSING_TABLE_SUMMARY') {
      actions.add(`add_table_summary:${item.componentId}`);
    }
    if (item.code === 'MISSING_SCREEN_READER_LABEL') {
      actions.add(`add_screen_reader_label:${item.componentId}`);
    }
    if (item.code === 'MISSING_VISIBLE_FOCUS_INDICATOR') {
      actions.add(`add_visible_focus_indicator:${item.componentId}`);
    }
    if (
      item.code === 'LOW_CONTRAST_CRITICAL_METRIC' ||
      item.code === 'LOW_CONTRAST_NONCRITICAL_METRIC'
    ) {
      actions.add(`improve_contrast:${item.componentId}`);
    }
    if (item.code === 'INVALID_CONTRAST_EVIDENCE') {
      actions.add(`provide_valid_contrast_evidence:${item.componentId}`);
    }
    if (item.code === 'PRIVATE_DATA_IN_ACCESSIBILITY_TEXT') {
      actions.add(`redact_accessibility_text:${item.componentId}`);
    }
    if (item.code === 'MALFORMED_DASHBOARD_COMPONENT_ENTRY') {
      actions.add(`repair_dashboard_component_evidence:${item.componentId}`);
    }
    if (item.code === 'MALFORMED_DASHBOARD_PACKET') {
      actions.add(`repair_dashboard_packet:${item.componentId}`);
    }
    if (item.code === 'MALFORMED_MOTION_EVIDENCE') {
      actions.add(`repair_motion_evidence:${item.componentId}`);
    }
  }

  return [...actions].sort();
}

function buildWcagSignals(findings) {
  const codes = new Set(findings.map((finding) => finding.code));
  return {
    perceivable:
      !codes.has('INVALID_CONTRAST_EVIDENCE') &&
      !codes.has('LOW_CONTRAST_CRITICAL_METRIC') &&
      !codes.has('LOW_CONTRAST_NONCRITICAL_METRIC') &&
      !codes.has('MISSING_TABLE_SUMMARY'),
    operable:
      !codes.has('KEYBOARD_TRAP') &&
      !codes.has('MISSING_REDUCED_MOTION_FALLBACK') &&
      !codes.has('MISSING_VISIBLE_FOCUS_INDICATOR') &&
      !codes.has('MALFORMED_MOTION_EVIDENCE'),
    understandable: !codes.has('PRIVATE_DATA_IN_ACCESSIBILITY_TEXT') && !codes.has('HEADING_ORDER_SKIP'),
    robust:
      !codes.has('MISSING_SCREEN_READER_LABEL') &&
      !codes.has('MALFORMED_DASHBOARD_COMPONENT_ENTRY') &&
      !codes.has('MALFORMED_DASHBOARD_PACKET')
  };
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(hexToRgb(foreground));
  const bg = relativeLuminance(hexToRgb(background));
  if (fg === null || bg === null) return null;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function createComponentIdentifierSanitizer() {
  const redactions = new Map();
  let redactionCount = 0;

  return (componentId) => {
    if (!containsPrivateIdentifier(componentId)) return componentId;
    if (!redactions.has(componentId)) {
      redactions.set(componentId, `component-redacted-${++redactionCount}`);
    }
    return redactions.get(componentId);
  };
}

function safeDashboardId(dashboardId) {
  return containsPrivateIdentifier(dashboardId) ? 'dashboard-redacted' : dashboardId;
}

function containsPrivateIdentifier(value = '') {
  return /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|orcid:\d{4}-\d{4}-\d{4}-\d{3}[\dx]|(?:file:\/\/|[A-Z]:[\\/]Users[\\/][^ \s"')]+|\/Users\/[^ \s"')]+|\/home\/[^ \s"')]+|\bprivate[- ]lab\b|\bpatient-export\b)/i.test(value);
}

function hexToRgb(hex) {
  if (typeof hex !== 'string') return null;
  const token = hex.trim().replace('#', '');
  const normalized = /^[0-9a-f]{3}$/i.test(token)
    ? token.split('').map((char) => char + char).join('')
    : token;
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function relativeLuminance(rgb) {
  if (!rgb) return null;
  const { r, g, b } = rgb;
  const channels = [r, g, b].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function containsPrivateData(value = '') {
  return /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|orcid:\d{4}-\d{4}-\d{4}-\d{3}[\dx]|(?:sso|student|user|account)\s+id|(?:file:\/\/|[A-Z]:[\\/]Users[\\/][^ \s"')]+|\/Users\/[^ \s"')]+|\/home\/[^ \s"')]+)|\bprivate[- ]lab\b|\bpatient-export\b|restricted project/i.test(value);
}

function accessibilityText(component) {
  return [component.screenReaderLabel, component.tableSummary].filter(Boolean).join(' ');
}

function digestPacket(packet) {
  return crypto.createHash('sha256').update(stableStringify(packet)).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  assessDashboardRelease
};
