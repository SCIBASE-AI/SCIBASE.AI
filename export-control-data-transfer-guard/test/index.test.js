import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTransferManifest,
  evaluateExportControlReadiness,
  sampleChallenges,
} from '../src/index.js';

test('holds challenges with controlled topics, sensitive data, and restricted jurisdictions', () => {
  const result = evaluateExportControlReadiness(sampleChallenges.blocked);

  assert.equal(result.decision, 'hold');
  assert.equal(result.blockers, 3);
  assert.ok(result.findings.some((finding) => finding.code === 'missing-export-classification'));
  assert.ok(result.findings.some((finding) => finding.code === 'missing-data-use-agreement'));
  assert.ok(result.findings.some((finding) => finding.code === 'restricted-participant-jurisdiction'));
});

test('returns revise when blockers are resolved but audit controls are incomplete', () => {
  const challenge = {
    ...sampleChallenges.blocked,
    participantCountries: ['US', 'DE'],
    controls: {
      exportClassification: 'requires-controlled-data-room',
      dataUseAgreement: true,
      dataRoomAccessLog: false,
      ndaWorkflow: true,
      payoutSanctionsScreening: true,
    },
  };

  const result = evaluateExportControlReadiness(challenge);

  assert.equal(result.decision, 'revise');
  assert.equal(result.blockers, 0);
  assert.equal(result.warnings, 1);
  assert.equal(result.findings[0].code, 'missing-transfer-audit-log');
});

test('releases public challenges when all controls are present', () => {
  const result = evaluateExportControlReadiness(sampleChallenges.releasable);

  assert.equal(result.decision, 'release');
  assert.equal(result.blockers, 0);
  assert.equal(result.warnings, 0);
  assert.deepEqual(result.findings, []);
});

test('builds a deterministic transfer manifest for reviewer audit', () => {
  const evaluation = evaluateExportControlReadiness(sampleChallenges.blocked);
  const manifest = buildTransferManifest(sampleChallenges.blocked, evaluation);

  assert.equal(manifest.generatedAt, '2026-06-05T12:40:00.000Z');
  assert.equal(manifest.challengeId, 'bio-agent-open-prize');
  assert.equal(manifest.decision, 'hold');
  assert.equal(manifest.dataRoom.accessLogRequired, true);
  assert.equal(manifest.eligibility.restrictedJurisdictionPresent, true);
  assert.equal(manifest.eligibility.payoutScreeningRequired, true);
});
