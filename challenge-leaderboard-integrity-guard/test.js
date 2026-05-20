'use strict';

const assert = require('assert/strict');
const { evaluateChallenge, digest } = require('./index');
const sampleData = require('./sample-data');

function testBlocksLeakedAndTamperedSubmission() {
  const result = evaluateChallenge(sampleData);

  assert.equal(result.decision, 'blocked');
  assert.equal(result.summary.totalSubmissions, 3);
  assert.equal(result.summary.blockedSubmissions, 1);
  assert.equal(result.payoutHold, true);
  assert.ok(result.blockers.some((finding) => finding.code === 'holdout_access_detected'));
  assert.ok(result.blockers.some((finding) => finding.code === 'metric_recomputation_mismatch'));
  assert.ok(result.blockers.some((finding) => finding.code === 'benchmark_package_mismatch'));
}

function testAllowsCleanChallenge() {
  const clean = {
    challenge: sampleData.challenge,
    submissions: [sampleData.submissions[0]],
    submissionHistory: [],
    checkedAt: sampleData.checkedAt,
  };

  const result = evaluateChallenge(clean);

  assert.equal(result.decision, 'approved');
  assert.equal(result.payoutHold, false);
  assert.equal(result.leaderboard[0].teamId, 'team-mendeleev');
  assert.equal(result.leaderboard[0].rank, 1);
  assert.equal(result.summary.blockers, 0);
  assert.equal(result.summary.warnings, 0);
}

function testWarnsOnSubmissionAbuseWithoutBlocking() {
  const review = {
    challenge: sampleData.challenge,
    submissions: [sampleData.submissions[1]],
    submissionHistory: sampleData.submissionHistory,
    checkedAt: sampleData.checkedAt,
  };

  const result = evaluateChallenge(review);

  assert.equal(result.decision, 'needs_review');
  assert.equal(result.summary.blockers, 0);
  assert.ok(result.warnings.some((finding) => finding.code === 'submission_limit_exceeded'));
  assert.ok(result.warnings.some((finding) => finding.code === 'resubmission_window_violation'));
  assert.ok(result.warnings.some((finding) => finding.code === 'audit_trail_missing'));
  assert.equal(result.payoutHold, true);
}

function testRejectsInvalidMetricContract() {
  const broken = {
    challenge: {
      ...sampleData.challenge,
      metric: {
        name: 'holdout_accuracy',
        direction: 'larger',
      },
    },
    submissions: [sampleData.submissions[0]],
    submissionHistory: [],
    checkedAt: sampleData.checkedAt,
  };

  const result = evaluateChallenge(broken);

  assert.equal(result.decision, 'blocked');
  assert.ok(result.blockers.some((finding) => finding.code === 'metric_contract_invalid'));
}

function testAuditDigestIsDeterministic() {
  const first = evaluateChallenge(sampleData);
  const second = evaluateChallenge(sampleData);

  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ b: 1, a: 2 }), digest({ a: 2, b: 1 }));
}

function run() {
  testBlocksLeakedAndTamperedSubmission();
  testAllowsCleanChallenge();
  testWarnsOnSubmissionAbuseWithoutBlocking();
  testRejectsInvalidMetricContract();
  testAuditDigestIsDeterministic();
  console.log('challenge-leaderboard-integrity-guard tests passed');
}

run();
