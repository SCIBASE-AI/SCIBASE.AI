const assert = require('assert');
const { evaluateSupplementReadiness } = require('./index');
const { blockedSupplementPackage, buildReadySupplementPackage } = require('./sample-data');

function testBlockedPackage() {
  const result = evaluateSupplementReadiness(blockedSupplementPackage);
  assert.strictEqual(result.status, 'hold');
  assert(result.blockers.includes('dataset-counts_checksum_mismatch'));
  assert(result.blockers.includes('code-analysis_missing_license'));
  assert(result.blockers.includes('notebook-main_notebook_not_rerunnable'));
  assert(result.blockers.includes('supplement-table-s4_missing_path'));
  assert(result.blockers.includes('raw-screening-notes_human_data_not_deidentified'));
  assert(result.warnings.includes('dataset-counts_stale_checksum'));
  assert(result.coverage.claimsBlocked >= 2);
}

function testReadyPackage() {
  const result = evaluateSupplementReadiness(buildReadySupplementPackage());
  assert.strictEqual(result.status, 'ready');
  assert.strictEqual(result.blockers.length, 0);
  assert.strictEqual(result.warnings.length, 0);
  assert.strictEqual(result.coverage.claimsReady, 3);
  assert(result.readinessScore >= 95);
}

function testMissingRequiredKindBlocks() {
  const data = buildReadySupplementPackage();
  data.supplementPackage.artifacts = data.supplementPackage.artifacts.filter((artifact) => artifact.kind !== 'protocol');
  const result = evaluateSupplementReadiness(data);
  assert.strictEqual(result.status, 'hold');
  assert(result.blockers.includes('missing_protocol_artifact_kind'));
  assert(result.claimResults.some((claim) => claim.id === 'claim-protocol' && claim.missingArtifacts.includes('protocol-stimulation')));
}

function testPrivacyReleaseBlocks() {
  const data = buildReadySupplementPackage();
  const notes = data.supplementPackage.artifacts.find((artifact) => artifact.id === 'raw-screening-notes');
  notes.access = 'public';
  notes.deidentified = false;
  const result = evaluateSupplementReadiness(data);
  assert.strictEqual(result.status, 'hold');
  assert(result.blockers.includes('raw-screening-notes_human_data_not_deidentified'));
}

function testDigestIsStable() {
  const first = evaluateSupplementReadiness(buildReadySupplementPackage()).auditDigest;
  const second = evaluateSupplementReadiness(buildReadySupplementPackage()).auditDigest;
  assert.strictEqual(first, second);
  assert.strictEqual(first.length, 64);
}

testBlockedPackage();
testReadyPackage();
testMissingRequiredKindBlocks();
testPrivacyReleaseBlocks();
testDigestIsStable();

console.log('5 supplement readiness assistant tests passed');
