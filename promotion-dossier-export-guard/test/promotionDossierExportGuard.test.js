'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  buildMarkdownReport,
  buildSvgSummary,
  evaluateBatch,
  evaluateDossier
} = require('../src');

const packet = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'examples', 'dossier-packets.json'), 'utf8')
);

function dossier(id) {
  return packet.dossiers.find((entry) => entry.id === id);
}

test('releases a dossier when consent, redaction, and evidence are present', () => {
  const result = evaluateDossier(dossier('dossier-release'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'RELEASE_DOSSIER');
  assert.equal(result.reasons.length, 0);
  assert.equal(result.exportSignals.blindReviewCount, 1);
});

test('holds exports for contributors who opted out', () => {
  const result = evaluateDossier(dossier('dossier-opt-out'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'HOLD_EXPORT');
  assert.ok(result.reasons.some((reason) => reason.code === 'CONTRIBUTOR_OPT_OUT'));
});

test('holds exports with blind reviewer leaks and restricted review authorization gaps', () => {
  const result = evaluateDossier(dossier('dossier-blind-leak'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'HOLD_EXPORT');
  assert.ok(result.reasons.some((reason) => reason.code === 'BLIND_REVIEW_IDENTITY_LEAK'));
  assert.ok(
    result.reasons.some((reason) => reason.code === 'RESTRICTED_REVIEW_EXPORT_NOT_AUTHORIZED')
  );
  assert.ok(result.reasons.some((reason) => reason.code === 'REPUTATION_DELTA_SOURCE_MISSING'));
});

test('routes stale or incomplete dossier evidence to review', () => {
  const result = evaluateDossier(dossier('dossier-stale-review'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'REVIEW_BEFORE_EXPORT');
  assert.ok(result.reasons.some((reason) => reason.code === 'CREDIT_EVIDENCE_MISSING'));
  assert.ok(result.reasons.some((reason) => reason.code === 'BADGE_EVIDENCE_STALE'));
});

test('batch summaries and reviewer artifacts are deterministic', () => {
  const batch = evaluateBatch(packet);
  const report = buildMarkdownReport(batch);
  const svg = buildSvgSummary(batch);

  assert.equal(batch.summary.totalDossiers, 4);
  assert.equal(batch.summary.release, 1);
  assert.equal(batch.summary.review, 1);
  assert.equal(batch.summary.hold, 2);
  assert.deepEqual(batch.summary.heldDossierIds, ['dossier-opt-out', 'dossier-blind-leak']);
  assert.match(report, /Promotion Dossier Export Report/);
  assert.match(report, /BLIND_REVIEW_IDENTITY_LEAK/);
  assert.match(svg, /Promotion dossier export guard summary/);
});
