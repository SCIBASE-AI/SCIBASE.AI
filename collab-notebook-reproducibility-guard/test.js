const assert = require('assert');

const { assessNotebookOutputPacket } = require('./index');
const { cleanPacket, unsafePacket, warningPacket } = require('./sample-data');

function findingCodes(packet) {
  return packet.findings.map((finding) => finding.code).sort();
}

function testHoldsUnsafeNotebookOutputsBeforeManuscriptAcceptance() {
  const packet = assessNotebookOutputPacket(unsafePacket);

  assert.equal(packet.status, 'hold_notebook_outputs');
  assert.equal(packet.acceptanceLanes.manuscriptInsertion, 'blocked');
  assert.equal(packet.acceptanceLanes.reviewerPreview, 'sanitized');
  assert.equal(packet.acceptanceLanes.auditRetention, 'reproducibility_hold');
  assert.deepEqual(findingCodes(packet), [
    'DEPENDENCY_LOCK_MISMATCH',
    'DUPLICATE_EXECUTION_COUNT',
    'DUPLICATE_EXECUTION_COUNT',
    'EXECUTION_ORDER_GAP',
    'MISSING_INPUT_FINGERPRINT',
    'MISSING_RANDOM_SEED',
    'MISSING_RUNTIME_DIGEST',
    'PRIVATE_OUTPUT_PATH',
    'SECTION_VERSION_MISMATCH',
    'STALE_NOTEBOOK_OUTPUT',
    'UNTRUSTED_RICH_HTML_OUTPUT'
  ]);

  assert.ok(packet.actions.includes('hold_notebook_outputs:notebook-output-packet-unsafe'));
  assert.ok(packet.actions.includes('rerun_notebook_from_clean_kernel'));
  assert.ok(packet.actions.includes('reset_kernel_and_run_all_cells'));
  assert.ok(packet.actions.includes('sanitize_rich_output:cell-fit-model'));
  assert.ok(packet.actions.includes('redact_private_output_paths:cell-load-data'));
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);

  const loadCell = packet.cells.find((cell) => cell.id === 'cell-load-data');
  const modelCell = packet.cells.find((cell) => cell.id === 'cell-fit-model');
  assert.match(loadCell.outputs[0].content, /\[redacted-local-path]/);
  assert.equal(modelCell.outputs[0].trusted, false);
  assert.doesNotMatch(modelCell.outputs[0].content, /<script|onerror=/i);
}

function testStagesWarningOnlyPacketForReproducibilityReview() {
  const packet = assessNotebookOutputPacket(warningPacket);

  assert.equal(packet.status, 'stage_for_reproducibility_review');
  assert.equal(packet.acceptanceLanes.manuscriptInsertion, 'review_required');
  assert.equal(packet.acceptanceLanes.reviewerPreview, 'watermarked');
  assert.deepEqual(findingCodes(packet), ['MISSING_RUNTIME_DIGEST']);
  assert.deepEqual(packet.actions, ['capture_runtime_digest:cell-methods-summary']);
  assert.equal(packet.reproducibilitySummary.blockers, 0);
  assert.equal(packet.reproducibilitySummary.warnings, 1);
}

function testAcceptsCleanContinuousRerunPacket() {
  const packet = assessNotebookOutputPacket(cleanPacket);

  assert.equal(packet.status, 'accept_notebook_outputs');
  assert.equal(packet.acceptanceLanes.manuscriptInsertion, 'allowed');
  assert.equal(packet.acceptanceLanes.reviewerPreview, 'allowed');
  assert.deepEqual(packet.findings, []);
  assert.deepEqual(packet.actions, ['accept_notebook_outputs:notebook-output-packet-clean']);
  assert.equal(packet.reproducibilitySummary.cells, 2);
  assert.equal(packet.reproducibilitySummary.notebooks, 1);
  assert.equal(packet.cells.every((cell) => cell.reviewState === 'ready_for_collaborative_acceptance'), true);
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

const tests = [
  testHoldsUnsafeNotebookOutputsBeforeManuscriptAcceptance,
  testStagesWarningOnlyPacketForReproducibilityReview,
  testAcceptsCleanContinuousRerunPacket
];

for (const test of tests) {
  test();
}

console.log(`collab-notebook-reproducibility-guard tests passed (${tests.length})`);
