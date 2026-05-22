'use strict';

const assert = require('assert');
const sampleBundles = require('./sample-data');
const {
  evaluateArtifact,
  evaluateCommitBundle,
  evaluateRepository,
  inferComponent,
  normalizePath
} = require('./index');

const asOfDate = '2026-05-22';

function testPathNormalizationAndComponentInference() {
  assert.equal(normalizePath('/data/raw.csv'), 'data/raw.csv');
  assert.equal(inferComponent('notebooks/run.ipynb'), 'notebooks');
  assert.equal(inferComponent('metadata.json'), 'metadata');
}

function testPublicCredentialExposureRejectsArtifact() {
  const packet = evaluateArtifact({
    path: 'notebooks/example.ipynb',
    kind: 'notebook',
    visibility: 'doi_snapshot',
    dataClass: 'controlled',
    sizeBytes: 12000,
    lfsPointer: false,
    signals: ['credential_marker']
  });

  assert.equal(packet.action, 'reject_commit_and_quarantine_export');
  assert.equal(packet.severity, 'critical');
  assert.ok(packet.findings.some((finding) => finding.code === 'credential_marker'));
}

function testSensitivePathNameIsHeld() {
  const packet = evaluateArtifact({
    path: 'code/.env',
    kind: 'code',
    visibility: 'private',
    dataClass: 'internal',
    sizeBytes: 300,
    lfsPointer: false,
    signals: []
  });

  assert.equal(packet.action, 'hold_tag_for_steward_review');
  assert.ok(packet.findings.some((finding) => finding.code === 'sensitive_path_name'));
}

function testMissingLfsPointerRequiresHygieneFix() {
  const packet = evaluateArtifact({
    path: 'results/model-weights.bin',
    kind: 'model_weights',
    visibility: 'private',
    dataClass: 'internal',
    sizeBytes: 88000000,
    lfsPointer: false,
    signals: []
  });

  assert.equal(packet.action, 'require_lfs_or_redaction_before_merge');
  assert.equal(packet.severity, 'medium');
  assert.ok(packet.findings.some((finding) => finding.code === 'missing_lfs_pointer'));
}

function testCleanArtifactAllowed() {
  const packet = evaluateArtifact({
    path: 'code/analysis.py',
    kind: 'code',
    visibility: 'preprint_export',
    dataClass: 'public',
    sizeBytes: 22000,
    lfsPointer: false,
    signals: []
  });

  assert.equal(packet.action, 'allow_commit_tag_export');
  assert.equal(packet.findingCount, 0);
}

function testCriticalBundleBuildsRewritePacket() {
  const packet = evaluateCommitBundle(sampleBundles[0], { asOfDate });

  assert.equal(packet.action, 'reject_bundle_and_require_history_rewrite');
  assert.equal(packet.severity, 'critical');
  assert.equal(packet.rollbackPacket.rewriteRequired, true);
  assert.ok(packet.heldPaths.includes('notebooks/immune-response-analysis.ipynb'));
  assert.ok(packet.heldPaths.includes('data/raw-participant-table.csv'));
  assert.equal(packet.auditDigest.length, 64);
}

function testPrivateConsentFormHoldsReleaseWithoutRewrite() {
  const packet = evaluateCommitBundle(sampleBundles[2], { asOfDate });

  assert.equal(packet.action, 'require_repository_hygiene_fix');
  assert.equal(packet.severity, 'medium');
  assert.equal(packet.rollbackPacket.rewriteRequired, false);
  assert.ok(packet.rollbackPacket.remediationActions.some((action) => action.path === 'protocols/consent-appendix.md'));
}

function testRepositorySummary() {
  const portfolio = evaluateRepository(sampleBundles, { asOfDate });

  assert.equal(portfolio.bundleCount, 4);
  assert.equal(portfolio.byAction.reject_bundle_and_require_history_rewrite, 1);
  assert.equal(portfolio.byAction.require_repository_hygiene_fix, 2);
  assert.equal(portfolio.byAction.allow_merge_tag_export, 1);
  assert.ok(portfolio.heldCommits.includes('syn-commit-a1'));
  assert.equal(portfolio.auditDigest.length, 64);
}

const tests = [
  testPathNormalizationAndComponentInference,
  testPublicCredentialExposureRejectsArtifact,
  testSensitivePathNameIsHeld,
  testMissingLfsPointerRequiresHygieneFix,
  testCleanArtifactAllowed,
  testCriticalBundleBuildsRewritePacket,
  testPrivateConsentFormHoldsReleaseWithoutRewrite,
  testRepositorySummary
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} repository sensitive artifact guard tests passed`);
