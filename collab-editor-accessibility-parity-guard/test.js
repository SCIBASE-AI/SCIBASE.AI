'use strict';

const assert = require('assert');
const sampleData = require('./sample-data');
const {
  evaluateAccessibilityParity,
  toMarkdownReport,
  toSvgSummary
} = require('./index');

function testBlocksMissingEquationAccessibleTextAndNotebookAltText() {
  const result = evaluateAccessibilityParity(sampleData);
  assert.strictEqual(result.status, 'hold_accessibility_release');
  assert.ok(result.summary.blockers.some((item) => item.message.includes('equation block has no accessible text')));
  assert.ok(result.summary.blockers.some((item) => item.message.includes('notebook visual output has no alt text')));
}

function testBlocksSuggestionWithoutAriaKeyboardOrAnchor() {
  const result = evaluateAccessibilityParity(sampleData);
  const suggestion = result.controlReviews.find((review) => review.id === 'suggestion-results-01');
  assert.ok(suggestion.blockers.some((blocker) => blocker.includes('no aria label')));
  assert.ok(suggestion.blockers.some((blocker) => blocker.includes('not keyboard reachable')));
  assert.ok(suggestion.blockers.some((blocker) => blocker.includes('no document anchor')));
}

function testFocusOrderUnknownTargetBlocksRelease() {
  const result = evaluateAccessibilityParity(sampleData);
  assert.ok(result.focusReview.blockers.some((blocker) => blocker.includes('unknown control missing-control')));
}

function testCleanEditorSurfacePasses() {
  const clean = {
    ...sampleData,
    focusOrder: sampleData.controls.map((control) => control.id),
    controls: sampleData.controls.map((control) => ({
      ...control,
      ariaLabel: control.ariaLabel || `${control.label} control`,
      tabReachable: true,
      availableInModes: ['markdown', 'wysiwyg'],
      accessibleText: control.type === 'equation' ? 'Delta equals treatment mean minus control mean' : control.accessibleText,
      outputAltText: control.type === 'notebook-cell' ? 'Bar plot comparing off-target counts by condition' : control.outputAltText,
      anchorId: control.type === 'suggestion' ? 'results-main-effect' : control.anchorId,
      screenReaderAnnouncement: control.type === 'lock' ? 'Final figures section locked for editing' : control.screenReaderAnnouncement
    }))
  };
  const result = evaluateAccessibilityParity(clean);
  assert.strictEqual(result.status, 'accessibility_ready');
  assert.strictEqual(result.summary.blockers.length, 0);
}

function testReportsRender() {
  const result = evaluateAccessibilityParity(sampleData);
  const markdown = toMarkdownReport(result);
  const svg = toSvgSummary(result);
  assert.ok(markdown.includes('Collaborative Editor Accessibility Parity Guard Report'));
  assert.ok(markdown.includes('Control Matrix'));
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('HOLD'));
}

const tests = [
  testBlocksMissingEquationAccessibleTextAndNotebookAltText,
  testBlocksSuggestionWithoutAriaKeyboardOrAnchor,
  testFocusOrderUnknownTargetBlocksRelease,
  testCleanEditorSurfacePasses,
  testReportsRender
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} tests passed`);
