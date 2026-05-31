const assert = require('assert');
const {
  evaluateScopeChangeControl,
  evaluateChangeRequest,
  compareRubric,
  digest
} = require('./index');
const {
  challenge,
  unsafeScopeChange,
  safeClarification,
  reviewedNdaUpdate,
  reviewInput
} = require('./sample-data');

function codes(result) {
  return new Set(result.findings.map((finding) => finding.code));
}

function testUnsafeScopeChangeIsHeld() {
  const result = evaluateChangeRequest(challenge, unsafeScopeChange);
  const resultCodes = codes(result);

  assert.strictEqual(result.decision, 'hold');
  assert(resultCodes.has('MISSING_CHANGE_APPROVALS'));
  assert(resultCodes.has('UNEQUAL_SOLVER_NOTICE'));
  assert(resultCodes.has('SUBMITTED_WORK_NOT_GRANDFATHERED'));
  assert(resultCodes.has('PRIZE_CHANGE_WITHOUT_ESCROW_EVIDENCE'));
  assert(result.actions.includes('Grandfather submitted work under original scope'));
}

function testSafeClarificationIsAllowed() {
  const result = evaluateChangeRequest(challenge, safeClarification);
  const resultCodes = codes(result);

  assert.strictEqual(result.decision, 'allow');
  assert(resultCodes.has('NON_MATERIAL_CHANGE'));
  assert(!resultCodes.has('UNEQUAL_SOLVER_NOTICE'));
}

function testReviewedNdaUpdateIsReviewOnly() {
  const result = evaluateChangeRequest(challenge, reviewedNdaUpdate);
  const resultCodes = codes(result);

  assert.strictEqual(result.decision, 'review');
  assert(resultCodes.has('MATERIAL_CHANGE_AFTER_LAUNCH'));
  assert(!resultCodes.has('DATA_ROOM_ACCESS_NOT_RECONFIRMED'));
  assert(!resultCodes.has('MISSING_SOLVER_CONSENT'));
}

function testRubricComparison() {
  const comparison = compareRubric(challenge.baseline.rubric, unsafeScopeChange.changes.rubric);

  assert.deepStrictEqual(comparison.added, ['wetlab']);
  assert.deepStrictEqual(comparison.removed, ['novelty']);
  assert.strictEqual(comparison.beforeTotal, 100);
  assert.strictEqual(comparison.afterTotal, 90);
}

function testOverallPacket() {
  const evaluation = evaluateScopeChangeControl(reviewInput);

  assert.strictEqual(evaluation.overallDecision, 'hold');
  assert.strictEqual(evaluation.requestCount, 3);
  assert.deepStrictEqual(evaluation.reviewerPacket.heldRequests, ['scope-change-unsafe-rubric-and-prize']);
  assert.deepStrictEqual(evaluation.reviewerPacket.reviewRequests, ['scope-change-reviewed-data-room-update']);
  assert.strictEqual(evaluation.reviewerPacket.baselineDigest, digest(challenge.baseline));
}

const tests = [
  testUnsafeScopeChangeIsHeld,
  testSafeClarificationIsAllowed,
  testReviewedNdaUpdateIsReviewOnly,
  testRubricComparison,
  testOverallPacket
];

for (const test of tests) {
  test();
  console.log(`ok - ${test.name}`);
}

console.log(`${tests.length} tests passed`);

