const scenarios = [
  {
    name: 'legal-hold-delete-block',
    repositoryId: 'repo-climate-ice-core',
    requestedAction: 'delete-export-bundle',
    taggedVersion: 'v2.1.0',
    generatedAt: '2026-05-22T12:00:00Z',
    components: [
      {path: 'manuscript/main.md', kind: 'manuscript', retainedUntil: '2032-01-01', archived: true, hash: 'sha256:manuscript'},
      {path: 'data/ice-core.csv', kind: 'dataset', retainedUntil: '2032-01-01', archived: true, hash: 'sha256:data'},
      {path: 'results/model.bin', kind: 'result', retainedUntil: '2032-01-01', archived: true, hash: 'sha256:model'},
    ],
    legalHolds: [
      {id: 'hold-ethics-review', active: true, scope: ['data/', 'results/'], reason: 'ethics review pending'},
    ],
    exportBundles: [
      {id: 'bundle-v2.1.0', version: 'v2.1.0', manifestHash: 'sha256:bundle', storage: ['doi', 'cold-archive']},
    ],
  },
  {
    name: 'release-needs-archive-evidence',
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
  },
  {
    name: 'approved-release',
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
  },
];

module.exports = {scenarios};
