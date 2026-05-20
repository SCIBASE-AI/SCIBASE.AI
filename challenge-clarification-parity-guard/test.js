'use strict';

const assert = require('assert/strict');
const {
  evaluateChallengeClarificationParityGuard,
  expectedClarificationRoot,
  digest,
} = require('./index');
const sample = require('./sample-data');

function testPublishesCleanClarifications() {
  const result = evaluateChallengeClarificationParityGuard(sample.cleanRegister);

  assert.equal(result.decision, 'publish_clarifications');
  assert.equal(result.summary.publishClarifications, 1);
  assert.equal(result.operatorTasks[0], 'Publish all clarification packets and continue challenge evaluation.');
}

function testLateRoutineAnswerPublishesWithControls() {
  const result = evaluateChallengeClarificationParityGuard({
    checkedAt: sample.register.checkedAt,
    challenges: [sample.lateButBroadcastChallenge],
  });

  assert.equal(result.decision, 'publish_with_controls');
  assert.ok(result.challenges[0].warnings.some((finding) => finding.code === 'answer_sla_missed'));
}

function testHoldsPrivateMaterialAnswer() {
  const result = evaluateChallengeClarificationParityGuard({
    checkedAt: sample.register.checkedAt,
    challenges: [sample.privateAnswerChallenge],
  });

  assert.equal(result.decision, 'hold_evaluation');
  assert.ok(result.challenges[0].blockers.some((finding) => finding.code === 'material_answer_not_broadcast'));
  assert.ok(result.challenges[0].blockers.some((finding) => finding.code === 'private_attachment_advantage'));
}

function testReopensWindowForScopeChangeWithoutAmendment() {
  const result = evaluateChallengeClarificationParityGuard({
    checkedAt: sample.register.checkedAt,
    challenges: [sample.scopeChangeChallenge],
  });

  assert.equal(result.decision, 'reopen_window');
  assert.ok(result.challenges[0].blockers.some((finding) => finding.code === 'scope_change_missing_amendment'));
  assert.ok(result.challenges[0].blockers.some((finding) => finding.code === 'scope_change_without_submission_extension'));
}

function testHoldsAnonymousIdentityLeak() {
  const result = evaluateChallengeClarificationParityGuard({
    checkedAt: sample.register.checkedAt,
    challenges: [sample.anonymousLeakChallenge],
  });

  assert.equal(result.decision, 'hold_evaluation');
  assert.ok(result.challenges[0].blockers.some((finding) => finding.code === 'anonymous_team_identity_leak'));
}

function testHoldsOverdueMaterialQuestion() {
  const result = evaluateChallengeClarificationParityGuard({
    checkedAt: sample.register.checkedAt,
    challenges: [sample.overdueChallenge],
  });

  assert.equal(result.decision, 'hold_evaluation');
  assert.ok(result.challenges[0].blockers.some((finding) => finding.code === 'material_question_unanswered'));
}

function testClarificationRootMismatchBlocksEvaluation() {
  const tampered = {
    ...sample.cleanChallenge,
    clarificationRoot: '0'.repeat(64),
  };
  const result = evaluateChallengeClarificationParityGuard({
    checkedAt: sample.register.checkedAt,
    challenges: [tampered],
  });

  assert.equal(result.decision, 'hold_evaluation');
  assert.ok(result.challenges[0].blockers.some((finding) => finding.code === 'clarification_root_mismatch'));
  assert.notEqual(expectedClarificationRoot(tampered), tampered.clarificationRoot);
}

function testCombinedSummaryAndDigestAreDeterministic() {
  const first = evaluateChallengeClarificationParityGuard(sample.register);
  const second = evaluateChallengeClarificationParityGuard(sample.register);

  assert.equal(first.decision, 'reopen_window');
  assert.equal(first.summary.totalChallenges, 6);
  assert.equal(first.summary.publishClarifications, 1);
  assert.equal(first.summary.publishWithControls, 1);
  assert.equal(first.summary.holdEvaluation, 3);
  assert.equal(first.summary.reopenWindow, 1);
  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ z: 3, a: 1 }), digest({ a: 1, z: 3 }));
}

function run() {
  testPublishesCleanClarifications();
  testLateRoutineAnswerPublishesWithControls();
  testHoldsPrivateMaterialAnswer();
  testReopensWindowForScopeChangeWithoutAmendment();
  testHoldsAnonymousIdentityLeak();
  testHoldsOverdueMaterialQuestion();
  testClarificationRootMismatchBlocksEvaluation();
  testCombinedSummaryAndDigestAreDeterministic();
  console.log('challenge-clarification-parity-guard tests passed');
}

run();
