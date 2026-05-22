const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateArtifactReplicaConsistency,
  buildReplicaConsistencyPacket,
} = require('./index');

test('holds public access when replicas disagree on checksum, manifest version, and access policy', () => {
  const result = evaluateArtifactReplicaConsistency({
    generatedAt: '2026-05-22T18:00:00Z',
    artifactId: 'dataset-cellatlas-v4',
    artifactType: 'dataset',
    canonical: {
      checksum: 'sha256:canonical-111',
      manifestVersion: '4.2.0',
      accessPolicy: 'controlled',
      dataciteDoi: '10.1234/cellatlas.v4',
      schemaOrgUrl: 'https://scibase.example/artifacts/dataset-cellatlas-v4',
    },
    replicas: [
      {id: 'primary-object-store', tier: 'primary', checksum: 'sha256:canonical-111', manifestVersion: '4.2.0', accessPolicy: 'controlled', lastVerifiedAt: '2026-05-21T18:00:00Z'},
      {id: 'cold-archive', tier: 'archive', checksum: 'sha256:archive-222', manifestVersion: '4.1.0', accessPolicy: 'controlled', lastVerifiedAt: '2026-05-18T18:00:00Z'},
      {id: 'institutional-mirror', tier: 'mirror', checksum: 'sha256:canonical-111', manifestVersion: '4.2.0', accessPolicy: 'public', lastVerifiedAt: '2026-05-10T18:00:00Z'},
    ],
    landingPage: {
      dataciteDoi: '10.1234/cellatlas.v3',
      schemaOrgUrl: 'https://scibase.example/artifacts/dataset-cellatlas-v4',
      accessPolicy: 'public',
    },
    actionsRequested: ['enable-preview', 'enable-export', 'enable-reproduce'],
  });

  assert.equal(result.decision, 'hold-artifact');
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    [
      'replica-checksum-mismatch',
      'manifest-version-mismatch',
      'access-policy-mismatch',
      'replica-verification-stale',
      'landing-page-datacite-mismatch',
      'landing-page-access-policy-mismatch',
    ]
  );
  assert.equal(result.summary.blockingFindingCount, 5);
  assert.equal(result.gatedActions.sort().join(','), 'enable-export,enable-preview,enable-reproduce');
  assert.match(result.repairPlan[0].reason, /cold-archive/);
});

test('routes stale mirror lag to repair review while keeping safe previews visible', () => {
  const result = evaluateArtifactReplicaConsistency({
    generatedAt: '2026-05-22T18:10:00Z',
    artifactId: 'notebook-rerun-pack',
    artifactType: 'notebook',
    maxMirrorLagHours: 48,
    canonical: {
      checksum: 'sha256:notebook-555',
      manifestVersion: '2.0.1',
      accessPolicy: 'public',
      dataciteDoi: '10.1234/notebook.rerun',
      schemaOrgUrl: 'https://scibase.example/artifacts/notebook-rerun-pack',
    },
    replicas: [
      {id: 'primary-object-store', tier: 'primary', checksum: 'sha256:notebook-555', manifestVersion: '2.0.1', accessPolicy: 'public', lastVerifiedAt: '2026-05-22T17:00:00Z'},
      {id: 'public-mirror', tier: 'mirror', checksum: 'sha256:notebook-555', manifestVersion: '2.0.1', accessPolicy: 'public', lastVerifiedAt: '2026-05-19T17:00:00Z'},
    ],
    landingPage: {
      dataciteDoi: '10.1234/notebook.rerun',
      schemaOrgUrl: 'https://scibase.example/artifacts/notebook-rerun-pack',
      accessPolicy: 'public',
    },
    actionsRequested: ['enable-preview', 'enable-export'],
  });

  assert.equal(result.decision, 'repair-review');
  assert.deepEqual(result.findings.map((finding) => finding.type), ['replica-verification-stale']);
  assert.equal(result.summary.reviewFindingCount, 1);
  assert.deepEqual(result.gatedActions, ['enable-export']);
  assert.deepEqual(result.visibleActions, ['enable-preview']);
});

test('approves consistent replicas and builds a publication-ready packet', () => {
  const result = evaluateArtifactReplicaConsistency({
    generatedAt: '2026-05-22T18:20:00Z',
    artifactId: 'model-weight-capsule',
    artifactType: 'model',
    canonical: {
      checksum: 'sha256:model-777',
      manifestVersion: '1.3.0',
      accessPolicy: 'open',
      dataciteDoi: '10.1234/model.weight',
      schemaOrgUrl: 'https://scibase.example/artifacts/model-weight-capsule',
    },
    replicas: [
      {id: 'primary-object-store', tier: 'primary', checksum: 'sha256:model-777', manifestVersion: '1.3.0', accessPolicy: 'open', lastVerifiedAt: '2026-05-22T17:30:00Z'},
      {id: 'cold-archive', tier: 'archive', checksum: 'sha256:model-777', manifestVersion: '1.3.0', accessPolicy: 'open', lastVerifiedAt: '2026-05-22T14:30:00Z'},
      {id: 'institutional-mirror', tier: 'mirror', checksum: 'sha256:model-777', manifestVersion: '1.3.0', accessPolicy: 'open', lastVerifiedAt: '2026-05-22T16:45:00Z'},
    ],
    landingPage: {
      dataciteDoi: '10.1234/model.weight',
      schemaOrgUrl: 'https://scibase.example/artifacts/model-weight-capsule',
      accessPolicy: 'open',
    },
    actionsRequested: ['enable-preview', 'enable-export', 'enable-reproduce'],
  });
  const packet = buildReplicaConsistencyPacket(result);

  assert.equal(result.decision, 'publish-artifact');
  assert.equal(result.summary.findingCount, 0);
  assert.deepEqual(result.gatedActions, []);
  assert.deepEqual(result.visibleActions.sort(), ['enable-export', 'enable-preview', 'enable-reproduce']);
  assert.match(packet, /model-weight-capsule/);
  assert.match(packet, /No repair action required/);
});
