'use strict';

const assert = require('assert/strict');
const { evaluateEditorAccessibility, digest } = require('./index');
const { document, cleanDocument } = require('./sample-data');

function testBlocksMissingAccessibleScientificContent() {
  const result = evaluateEditorAccessibility({ document });

  assert.equal(result.decision, 'blocked');
  assert.equal(result.summary.totalBlocks, 8);
  assert.equal(result.summary.blockedBlocks, 2);
  assert.equal(result.releaseHold, true);
  assert.ok(result.blockers.some((finding) => finding.code === 'equation_fallback_missing'));
  assert.ok(result.blockers.some((finding) => finding.code === 'figure_alt_text_missing'));
}

function testCleanDocumentIsApproved() {
  const result = evaluateEditorAccessibility({ document: cleanDocument });

  assert.equal(result.decision, 'approved');
  assert.equal(result.releaseHold, false);
  assert.equal(result.summary.blockers, 0);
  assert.equal(result.summary.warnings, 0);
}

function testWarningsDoNotBlockReleaseByThemselves() {
  const reviewDocument = {
    ...cleanDocument,
    blocks: [
      ...cleanDocument.blocks,
      {
        id: 'code-review',
        type: 'code',
        section: 'methods',
        language: 'r',
        output: {
          kind: 'table',
          caption: 'Model summary coefficients.',
        },
        wysiwygPreview: 'R code preview.',
        keyboardLabel: 'R model summary code',
      },
    ],
  };

  const result = evaluateEditorAccessibility({ document: reviewDocument });

  assert.equal(result.decision, 'needs_review');
  assert.equal(result.summary.blockers, 0);
  assert.ok(result.warnings.some((finding) => finding.code === 'code_caption_missing'));
}

function testHeadingOrderWarning() {
  const headingDocument = {
    id: 'heading-test',
    title: 'Heading Test',
    blocks: [
      {
        id: 'h1',
        type: 'heading',
        level: 1,
        keyboardLabel: 'Level one',
      },
      {
        id: 'h3',
        type: 'heading',
        level: 3,
        keyboardLabel: 'Level three',
      },
    ],
  };

  const result = evaluateEditorAccessibility({ document: headingDocument });

  assert.equal(result.decision, 'needs_review');
  assert.ok(result.warnings.some((finding) => finding.code === 'heading_order_jump'));
}

function testAuditDigestIsDeterministic() {
  const first = evaluateEditorAccessibility({ document });
  const second = evaluateEditorAccessibility({ document });

  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ b: 1, a: 2 }), digest({ a: 2, b: 1 }));
}

function run() {
  testBlocksMissingAccessibleScientificContent();
  testCleanDocumentIsApproved();
  testWarningsDoNotBlockReleaseByThemselves();
  testHeadingOrderWarning();
  testAuditDigestIsDeterministic();
  console.log('editor-accessibility-parity-guard tests passed');
}

run();
