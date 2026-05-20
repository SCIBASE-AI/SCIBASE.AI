'use strict';

const assert = require('assert/strict');
const { evaluateBadgeRenewals, digest } = require('./index');
const sample = require('./sample-data');

function testRenewsCleanBadge() {
  const result = evaluateBadgeRenewals({
    candidates: sample.cleanCandidates,
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.decision, 'renewed');
  assert.equal(result.summary.renewed, 1);
  assert.equal(result.leaderboardHold, false);
  assert.equal(result.badges[0].reputationDelta, 16);
}

function testExpiresDriftedBadge() {
  const result = evaluateBadgeRenewals({
    candidates: [sample.candidates[1]],
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.decision, 'expired');
  assert.equal(result.leaderboardHold, true);
  assert.ok(result.blockers.some((finding) => finding.code === 'artifact_hash_drift'));
  assert.ok(result.blockers.some((finding) => finding.code === 'rerun_pass_rate_low'));
  assert.ok(result.warnings.some((finding) => finding.code === 'self_verification_detected'));
}

function testRevokesRetractedBadge() {
  const result = evaluateBadgeRenewals({
    candidates: [sample.candidates[2]],
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.decision, 'revoked');
  assert.equal(result.summary.revoked, 1);
  assert.ok(result.blockers.some((finding) => finding.code === 'retraction_notice_present'));
  assert.ok(result.reviewerTasks.some((task) => task.includes('Revoke badges')));
}

function testCombinedSummary() {
  const result = evaluateBadgeRenewals({
    candidates: sample.candidates,
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.decision, 'revoked');
  assert.equal(result.summary.totalCandidates, 3);
  assert.equal(result.summary.renewed, 1);
  assert.equal(result.summary.expired, 1);
  assert.equal(result.summary.revoked, 1);
}

function testMissingEvidenceExpires() {
  const result = evaluateBadgeRenewals({
    candidates: [
      {
        userId: 'researcher-empty',
        projectId: 'project-empty',
        badgeId: 'badge-empty',
        expectedHashes: {},
        observedHashes: {},
      },
    ],
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.decision, 'expired');
  assert.ok(result.blockers.some((finding) => finding.code === 'rerun_evidence_missing'));
}

function testAuditDigestIsDeterministic() {
  const input = {
    candidates: sample.candidates,
    checkedAt: sample.checkedAt,
  };
  const first = evaluateBadgeRenewals(input);
  const second = evaluateBadgeRenewals(input);

  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ b: 1, a: 2 }), digest({ a: 2, b: 1 }));
}

function run() {
  testRenewsCleanBadge();
  testExpiresDriftedBadge();
  testRevokesRetractedBadge();
  testCombinedSummary();
  testMissingEvidenceExpires();
  testAuditDigestIsDeterministic();
  console.log('reproducibility-badge-renewal-guard tests passed');
}

run();
