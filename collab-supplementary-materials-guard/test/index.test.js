import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSupplementManifest,
  evaluateSupplementaryExport,
  samplePackets,
} from '../src/index.js';

test('holds export when a supplement is stale, unreconciled, or leaking review notes', () => {
  const result = evaluateSupplementaryExport(samplePackets.blocked);

  assert.equal(result.decision, 'hold');
  assert.equal(result.blockers, 6);
  assert.ok(result.findings.some((finding) => finding.code === 'stale-export-hash'));
  assert.ok(result.findings.some((finding) => finding.code === 'stale-notebook-output'));
  assert.ok(result.findings.some((finding) => finding.code === 'missing-redaction-review'));
  assert.ok(result.findings.some((finding) => finding.code === 'private-reviewer-note-leak'));
  assert.ok(result.findings.some((finding) => finding.code === 'unresolved-blocking-comment'));
  assert.ok(result.findings.some((finding) => finding.code === 'unreferenced-supplement'));
});

test('returns revise when only approval, license, or lock warnings remain', () => {
  const packet = {
    ...samplePackets.ready,
    supplements: [
      {
        ...samplePackets.ready.supplements[0],
        license: 'custom-lab-license',
        lockedAtExport: false,
        approvals: [{ role: 'corresponding-author', approved: true }],
      },
    ],
    comments: [],
  };

  const result = evaluateSupplementaryExport(packet);

  assert.equal(result.decision, 'revise');
  assert.equal(result.blockers, 0);
  assert.equal(result.warnings, 3);
  assert.deepEqual(result.findings.map((finding) => finding.code), [
    'license-needs-review',
    'missing-export-approval',
    'unlocked-supplement-section',
  ]);
});

test('marks a manuscript export-ready when supplements are cited, locked, fresh, and approved', () => {
  const result = evaluateSupplementaryExport(samplePackets.ready);

  assert.equal(result.decision, 'export-ready');
  assert.equal(result.blockers, 0);
  assert.equal(result.warnings, 0);
  assert.deepEqual(result.findings, []);
});

test('builds a deterministic reviewer manifest', () => {
  const evaluation = evaluateSupplementaryExport(samplePackets.blocked);
  const manifest = buildSupplementManifest(samplePackets.blocked, evaluation);

  assert.equal(manifest.generatedAt, '2026-06-05T15:10:00.000Z');
  assert.equal(manifest.manuscriptId, 'ms-collab-neuro-042');
  assert.equal(manifest.decision, 'hold');
  assert.equal(manifest.supplements.length, 3);
  assert.equal(manifest.supplements[0].referenced, true);
  assert.equal(manifest.supplements[2].referenced, false);
});
