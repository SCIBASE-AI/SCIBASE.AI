const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateRepositoryRetention,
  buildRetentionReport,
} = require('./index');

test('blocks destructive export deletion while legal hold is active', () => {
  const result = evaluateRepositoryRetention({
    repositoryId: 'repo-climate-ice-core',
    requestedAction: 'delete-export-bundle',
    taggedVersion: 'v2.1.0',
    generatedAt: '2026-05-22T12:00:00Z',
    components: [
      {path: 'manuscript/main.md', kind: 'manuscript', retainedUntil: '2032-01-01', archived: true, hash: 'sha256:manuscript'},
      {path: 'data/ice-core.csv', kind: 'dataset', retainedUntil: '2032-01-01', archived: true, hash: 'sha256:data'},
      {path: 'code/analyze.py', kind: 'code', retainedUntil: '2030-01-01', archived: true, hash: 'sha256:code'},
    ],
    legalHolds: [
      {id: 'hold-ethics-review', active: true, scope: ['data/', 'results/'], reason: 'ethics review pending'},
    ],
    exportBundles: [
      {id: 'bundle-v2.1.0', version: 'v2.1.0', manifestHash: 'sha256:bundle', storage: ['doi', 'cold-archive']},
    ],
  });

  assert.equal(result.decision, 'blocked');
  assert.equal(result.blockers.length, 1);
  assert.match(result.blockers[0], /legal hold/i);
  assert.equal(result.requiredActions[0].type, 'preserve_legal_hold_scope');
});

test('requires archive evidence before repository version release', () => {
  const result = evaluateRepositoryRetention({
    repositoryId: 'repo-open-assay',
    requestedAction: 'publish-version',
    taggedVersion: 'v1.0.0',
    generatedAt: '2026-05-22T12:00:00Z',
    components: [
      {path: 'manuscript/main.md', kind: 'manuscript', retainedUntil: '2031-01-01', archived: true, hash: 'sha256:manuscript'},
      {path: 'data/assay.csv', kind: 'dataset', retainedUntil: '2031-01-01', archived: false, hash: 'sha256:data'},
      {path: 'results/figure.svg', kind: 'result', retainedUntil: '2031-01-01', archived: true, hash: 'sha256:figure'},
    ],
    legalHolds: [],
    exportBundles: [
      {id: 'bundle-v1.0.0', version: 'v1.0.0', manifestHash: '', storage: ['doi']},
    ],
  });

  assert.equal(result.decision, 'needs-remediation');
  assert.deepEqual(result.blockers, [
    'data/assay.csv lacks archive evidence',
    'bundle-v1.0.0 lacks a manifest hash',
  ]);
  assert.equal(result.requiredActions.length, 2);
});

test('builds deterministic reviewer report for compliant repository release', () => {
  const result = evaluateRepositoryRetention({
    repositoryId: 'repo-compliant-release',
    requestedAction: 'publish-version',
    taggedVersion: 'v3.0.0',
    generatedAt: '2026-05-22T12:00:00Z',
    components: [
      {path: 'manuscript/main.md', kind: 'manuscript', retainedUntil: '2035-01-01', archived: true, hash: 'sha256:a'},
      {path: 'data/raw.csv', kind: 'dataset', retainedUntil: '2035-01-01', archived: true, hash: 'sha256:b'},
      {path: 'code/reproduce.py', kind: 'code', retainedUntil: '2032-01-01', archived: true, hash: 'sha256:c'},
      {path: 'results/model.bin', kind: 'result', retainedUntil: '2032-01-01', archived: true, hash: 'sha256:d'},
    ],
    legalHolds: [{id: 'hold-old', active: false, scope: ['data/'], reason: 'released'}],
    exportBundles: [
      {id: 'bundle-v3.0.0', version: 'v3.0.0', manifestHash: 'sha256:bundle', storage: ['doi', 'cold-archive', 'institutional-copy']},
    ],
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.blockers.length, 0);
  assert.equal(result.coverage.componentCount, 4);
  assert.equal(result.coverage.archiveCoverage, 1);

  const report = buildRetentionReport(result);
  assert.match(report, /repo-compliant-release/);
  assert.match(report, /Decision: approved/);
  assert.match(report, /Archive coverage: 100%/);
});
