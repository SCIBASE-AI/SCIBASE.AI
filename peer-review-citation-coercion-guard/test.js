const assert = require('assert');
const {
  evaluateCitationCoercion,
  buildSampleReviewPacket
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testUnsupportedSelfCitationDemandTriggersStewardReview() {
  const result = evaluateCitationCoercion(buildSampleReviewPacket());
  const decision = byId(result.reviewDecisions, 'review-r1-self-citation');

  assert.equal(decision.decision, 'steward-review-required');
  assert.equal(decision.highestSeverity, 'high');
  assert.ok(decision.flags.includes('unsupported-self-citation-demand'));
  assert.ok(decision.flags.includes('off-topic-citation-cluster'));

  const reputationHold = byId(result.reputationActions, 'hold-review-r1-self-citation');
  assert.equal(reputationHold.action, 'hold-reviewer-credit');
  assert.equal(reputationHold.effectiveReviewerDelta, 0);
  assert.deepEqual(reputationHold.blockedUpdates, [
    'reviewer-reputation',
    'trusted-reviewer-badge',
    'leaderboards',
    'project-timeline'
  ]);
}

function testReciprocalCitationPressureIsFlaggedWithoutPunishingAuthors() {
  const result = evaluateCitationCoercion(buildSampleReviewPacket());
  const decision = byId(result.reviewDecisions, 'review-r2-reciprocal-pressure');

  assert.equal(decision.decision, 'steward-review-required');
  assert.ok(decision.flags.includes('reciprocal-citation-pressure'));

  const authorProtection = byId(result.authorProtections, 'protect-project-neuro-open');
  assert.equal(authorProtection.action, 'block-author-penalty');
  assert.ok(authorProtection.reasons.includes('citation-pressure-under-review'));
}

function testJournalQuotaPressureBlocksReputationChanges() {
  const result = evaluateCitationCoercion(buildSampleReviewPacket());
  const decision = byId(result.reviewDecisions, 'review-r3-quota-pressure');

  assert.ok(decision.flags.includes('journal-citation-quota-pressure'));
  assert.equal(decision.requiredStewardAction, 'review-citation-demands-before-score-or-badge-update');

  const task = byId(result.stewardTasks, 'task-review-r3-quota-pressure');
  assert.equal(task.priority, 'high');
  assert.equal(task.requiredAction, 'remove-or-justify-coercive-citation-requests');
}

function testLegitimateCitationSuggestionStaysAllowed() {
  const result = evaluateCitationCoercion(buildSampleReviewPacket());
  const decision = byId(result.reviewDecisions, 'review-r4-legitimate-context');

  assert.equal(decision.decision, 'allow-reputation-update');
  assert.deepEqual(decision.flags, []);

  const action = byId(result.reputationActions, 'apply-review-r4-legitimate-context');
  assert.equal(action.action, 'apply-reviewer-credit');
  assert.equal(action.effectiveReviewerDelta, 8);
}

function testBlindReviewerIdentityIsRedactedFromOutputs() {
  const result = evaluateCitationCoercion(buildSampleReviewPacket());
  const serialized = JSON.stringify(result);

  assert.ok(serialized.includes('anonymous-reviewer-42'));
  assert.ok(!serialized.includes('orcid:0000-0002-private-pressure'));
  assert.ok(!serialized.includes('private-pressure@example.edu'));
}

function testSummaryAndAuditDigestAreDeterministic() {
  const first = evaluateCitationCoercion(buildSampleReviewPacket());
  const second = evaluateCitationCoercion(buildSampleReviewPacket());

  assert.equal(first.summary.totalReviews, 4);
  assert.equal(first.summary.flaggedReviews, 3);
  assert.equal(first.summary.heldReviewerCredit, 23);
  assert.equal(first.summary.recommendedAction, 'pause-coerced-citation-reputation-updates');
  assert.equal(first.auditPacket.auditDigest, second.auditPacket.auditDigest);
  assert.ok(first.auditPacket.auditDigest.startsWith('sha256:'));
}

const tests = [
  testUnsupportedSelfCitationDemandTriggersStewardReview,
  testReciprocalCitationPressureIsFlaggedWithoutPunishingAuthors,
  testJournalQuotaPressureBlocksReputationChanges,
  testLegitimateCitationSuggestionStaysAllowed,
  testBlindReviewerIdentityIsRedactedFromOutputs,
  testSummaryAndAuditDigestAreDeterministic
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} peer-review citation coercion guard tests passed`);
