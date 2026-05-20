'use strict';

const assert = require('assert/strict');
const { evaluateLiteratureSurveillance, digest } = require('./index');
const sample = require('./sample-data');

function testBlocksContradictedClaims() {
  const result = evaluateLiteratureSurveillance({
    manuscript: sample.manuscript,
    literatureEvents: sample.literatureEvents,
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.decision, 'blocked');
  assert.equal(result.summary.totalClaims, 3);
  assert.equal(result.summary.blockedClaims, 1);
  assert.equal(result.reportHold, true);
  assert.ok(result.blockers.some((finding) => finding.code === 'strong_contradictory_evidence'));
  assert.ok(result.warnings.some((finding) => finding.code === 'high_value_supporting_update'));
  assert.ok(result.warnings.some((finding) => finding.code === 'cited_evidence_corrected'));
}

function testBlocksRetractedEvidence() {
  const result = evaluateLiteratureSurveillance({
    manuscript: sample.manuscript,
    literatureEvents: [sample.retractionEvent],
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.decision, 'blocked');
  assert.ok(result.blockers.some((finding) => finding.code === 'cited_evidence_retracted'));
  assert.ok(result.reviewerTasks.some((task) => task.includes('retracted evidence')));
}

function testCleanPacketApproved() {
  const result = evaluateLiteratureSurveillance({
    manuscript: sample.cleanManuscript,
    literatureEvents: [],
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.reportHold, false);
  assert.equal(result.summary.blockers, 0);
  assert.equal(result.summary.warnings, 0);
}

function testStaleClaimWarning() {
  const stale = {
    manuscript: {
      id: 'stale',
      title: 'Stale Claim',
      claims: [
        {
          id: 'claim-stale',
          text: 'Old claim that needs review.',
          evidenceIds: ['ev-old'],
          lastReviewedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
    },
    literatureEvents: [],
    checkedAt: sample.checkedAt,
  };

  const result = evaluateLiteratureSurveillance(stale);

  assert.equal(result.decision, 'needs_review');
  assert.ok(result.warnings.some((finding) => finding.code === 'claim_review_stale'));
}

function testResearchGapSignals() {
  const result = evaluateLiteratureSurveillance({
    manuscript: sample.manuscript,
    literatureEvents: sample.literatureEvents,
    checkedAt: sample.checkedAt,
  });

  assert.equal(result.summary.gapSignals, 1);
  assert.equal(result.gapSignals[0].signal, 'negative_or_null_result');
  assert.equal(result.updateQueue.length, sample.literatureEvents.length);
}

function testAuditDigestIsDeterministic() {
  const input = {
    manuscript: sample.manuscript,
    literatureEvents: sample.literatureEvents,
    checkedAt: sample.checkedAt,
  };
  const first = evaluateLiteratureSurveillance(input);
  const second = evaluateLiteratureSurveillance(input);

  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ b: 1, a: 2 }), digest({ a: 2, b: 1 }));
}

function run() {
  testBlocksContradictedClaims();
  testBlocksRetractedEvidence();
  testCleanPacketApproved();
  testStaleClaimWarning();
  testResearchGapSignals();
  testAuditDigestIsDeterministic();
  console.log('living-literature-surveillance-assistant tests passed');
}

run();
