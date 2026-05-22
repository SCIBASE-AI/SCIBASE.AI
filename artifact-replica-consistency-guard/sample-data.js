const scenarios = [
  {
    name: 'Controlled dataset has drifted archive and public landing-page policy',
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
  },
  {
    name: 'Notebook mirror lag needs repair review',
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
  },
  {
    name: 'Model capsule replicas are ready for publication',
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
  },
];

module.exports = {scenarios};
