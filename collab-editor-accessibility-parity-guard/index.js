'use strict';

const DEFAULT_NOW = '2026-05-21T10:45:00.000Z';
const REQUIRED_MODES = ['markdown', 'wysiwyg'];
const INTERACTIVE_TYPES = new Set(['toolbar', 'comment', 'suggestion', 'lock', 'notebook-cell']);

function listMissing(object, fields) {
  return fields.filter((field) => object[field] === undefined || object[field] === null || object[field] === '');
}

function hasModeParity(control) {
  const modes = new Set(control.availableInModes || []);
  return REQUIRED_MODES.every((mode) => modes.has(mode));
}

function evaluateControl(control) {
  const blockers = [];
  const warnings = [];
  const actions = [];

  const missing = listMissing(control, ['id', 'type', 'label']);
  if (missing.length > 0) {
    blockers.push(`missing required fields: ${missing.join(', ')}`);
    actions.push('complete control metadata before exposing the editor surface');
  }

  if (INTERACTIVE_TYPES.has(control.type)) {
    if (!control.ariaLabel) {
      blockers.push('interactive control has no aria label');
      actions.push(`add an aria label to ${control.id}`);
    }
    if (!control.keyboardShortcut && !control.tabReachable) {
      blockers.push('interactive control is not keyboard reachable');
      actions.push(`make ${control.id} reachable by tab order or shortcut`);
    }
    if (!hasModeParity(control)) {
      warnings.push('control is not available in both Markdown and WYSIWYG modes');
      actions.push(`add mode parity for ${control.id}`);
    }
  }

  if (control.type === 'equation' && !control.accessibleText) {
    blockers.push('equation block has no accessible text');
    actions.push(`add spoken math text for ${control.id}`);
  }

  if (control.type === 'notebook-cell' && control.outputKind !== 'text' && !control.outputAltText) {
    blockers.push('notebook visual output has no alt text');
    actions.push(`add output alt text for notebook cell ${control.id}`);
  }

  if ((control.type === 'comment' || control.type === 'suggestion') && !control.anchorId) {
    blockers.push('review annotation has no document anchor');
    actions.push(`anchor ${control.id} to a manuscript block or notebook cell`);
  }

  if (control.type === 'lock' && !control.screenReaderAnnouncement) {
    warnings.push('section lock does not announce state changes');
    actions.push(`add lock/unlock announcement text for ${control.id}`);
  }

  return {
    id: control.id,
    type: control.type,
    label: control.label,
    blockers,
    warnings,
    actions
  };
}

function evaluateFocusOrder(focusOrder, controls) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const controlIds = new Set(controls.map((control) => control.id));
  const seen = new Set();

  for (const id of focusOrder || []) {
    if (!controlIds.has(id)) {
      blockers.push(`focus order references unknown control ${id}`);
      actions.push(`remove or define focus target ${id}`);
    }
    if (seen.has(id)) {
      warnings.push(`duplicate focus target ${id}`);
      actions.push(`deduplicate focus target ${id}`);
    }
    seen.add(id);
  }

  for (const control of controls) {
    if (INTERACTIVE_TYPES.has(control.type) && !seen.has(control.id) && !control.keyboardShortcut) {
      blockers.push(`interactive control ${control.id} is missing from focus order`);
      actions.push(`add ${control.id} to the focus order`);
    }
  }

  return { blockers, warnings, actions };
}

function summarize(controlReviews, focusReview) {
  const blockers = [];
  const warnings = [];
  const actions = [];

  for (const review of controlReviews) {
    for (const blocker of review.blockers) {
      blockers.push({ controlId: review.id, message: blocker });
    }
    for (const warning of review.warnings) {
      warnings.push({ controlId: review.id, message: warning });
    }
    for (const action of review.actions) {
      actions.push({ controlId: review.id, action });
    }
  }

  for (const blocker of focusReview.blockers) {
    blockers.push({ controlId: 'focus-order', message: blocker });
  }
  for (const warning of focusReview.warnings) {
    warnings.push({ controlId: 'focus-order', message: warning });
  }
  for (const action of focusReview.actions) {
    actions.push({ controlId: 'focus-order', action });
  }

  return {
    status: blockers.length > 0
      ? 'hold_accessibility_release'
      : warnings.length > 0
        ? 'accessibility_review_needed'
        : 'accessibility_ready',
    blockers,
    warnings,
    actions
  };
}

function evaluateAccessibilityParity(input, options = {}) {
  const generatedAt = options.now || input.generatedAt || DEFAULT_NOW;
  const controlReviews = input.controls.map(evaluateControl);
  const focusReview = evaluateFocusOrder(input.focusOrder, input.controls);
  const summary = summarize(controlReviews, focusReview);

  return {
    documentId: input.documentId,
    documentTitle: input.documentTitle,
    generatedAt,
    status: summary.status,
    modePolicy: REQUIRED_MODES,
    summary,
    controlReviews,
    focusReview
  };
}

function toMarkdownReport(result) {
  const lines = [
    '# Collaborative Editor Accessibility Parity Guard Report',
    '',
    `Document: ${result.documentTitle} (${result.documentId})`,
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Controls reviewed: ${result.controlReviews.length}`,
    `- Blockers: ${result.summary.blockers.length}`,
    `- Warnings: ${result.summary.warnings.length}`,
    `- Required modes: ${result.modePolicy.join(', ')}`,
    ''
  ];

  if (result.summary.blockers.length > 0) {
    lines.push('## Blockers', '');
    for (const blocker of result.summary.blockers) {
      lines.push(`- ${blocker.controlId}: ${blocker.message}`);
    }
    lines.push('');
  }

  if (result.summary.warnings.length > 0) {
    lines.push('## Warnings', '');
    for (const warning of result.summary.warnings) {
      lines.push(`- ${warning.controlId}: ${warning.message}`);
    }
    lines.push('');
  }

  lines.push('## Required Actions', '');
  for (const action of result.summary.actions) {
    lines.push(`- ${action.controlId}: ${action.action}`);
  }
  lines.push('');

  lines.push('## Control Matrix', '');
  for (const review of result.controlReviews) {
    lines.push(`- ${review.id} (${review.type}): ${review.blockers.length} blockers, ${review.warnings.length} warnings`);
  }

  return `${lines.join('\n')}\n`;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toSvgSummary(result) {
  const statusColor = result.status === 'accessibility_ready' ? '#0f766e' : '#b91c1c';
  const statusLabel = result.status === 'accessibility_ready' ? 'READY' : 'HOLD';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="Collaborative editor accessibility summary">
  <rect width="1280" height="720" fill="#0f172a"/>
  <rect x="72" y="72" width="1136" height="576" rx="24" fill="#f8fafc"/>
  <text x="112" y="138" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#111827">Collaborative Editor Accessibility Parity Guard</text>
  <text x="112" y="188" font-family="Arial, sans-serif" font-size="22" fill="#475569">${xmlEscape(result.documentTitle)}</text>
  <rect x="112" y="232" width="230" height="118" rx="18" fill="${statusColor}"/>
  <text x="148" y="304" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#ffffff">${statusLabel}</text>
  <text x="112" y="416" font-family="Arial, sans-serif" font-size="28" fill="#111827">Controls reviewed: ${result.controlReviews.length}</text>
  <text x="112" y="466" font-family="Arial, sans-serif" font-size="28" fill="#111827">Blockers: ${result.summary.blockers.length}</text>
  <text x="112" y="516" font-family="Arial, sans-serif" font-size="28" fill="#111827">Warnings: ${result.summary.warnings.length}</text>
  <text x="640" y="304" font-family="Arial, sans-serif" font-size="24" fill="#334155">Checks keyboard reachability, screen-reader labels, visual output alt text, and Markdown/WYSIWYG parity before collaborative release.</text>
</svg>
`;
}

module.exports = {
  evaluateAccessibilityParity,
  toMarkdownReport,
  toSvgSummary
};
