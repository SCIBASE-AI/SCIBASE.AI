const scenarios = [
  {
    name: 'RNA velocity notebook has incompatible runtime stack',
    generatedAt: '2026-05-22T16:00:00Z',
    recommendationId: 'rec-rna-velocity-notebook',
    userContext: {institutionId: 'inst-northbridge', allowPreRelease: false},
    paths: [
      {
        id: 'path-rna-velocity',
        from: 'concept-rna-velocity',
        to: 'notebook-velocity-2024',
        rank: 1,
        nodes: [
          {id: 'concept-rna-velocity', type: 'concept', title: 'RNA velocity'},
          {id: 'notebook-velocity-2024', type: 'notebook', title: 'Velocity rerun notebook'},
          {id: 'dataset-cellatlas-v3', type: 'dataset', title: 'Cell Atlas v3', format: {name: 'h5ad', version: '0.9.2'}},
        ],
        software: [
          {name: 'python', installed: '3.8.18', required: '>=3.10 <3.12', source: 'runtime'},
          {name: 'scanpy', installed: '1.8.2', required: '>=1.10 <2.0', source: 'lockfile'},
          {name: 'anndata', installed: '0.8.0', required: '>=0.10 <0.11', source: 'dataset metadata'},
        ],
        containers: [{image: 'ghcr.io/scibase/velocity', tag: 'latest', digest: ''}],
        workflows: [{engine: 'nextflow', installed: '22.10.6', required: '>=23.10 <24.0'}],
        evidence: [{type: 'lockfile', id: 'poetry.lock', present: true}, {type: 'runtime-capture', id: 'runner-884', capturedAt: '2026-01-08'}],
      },
    ],
  },
  {
    name: 'Spatial protocol is compatible but provenance needs curator review',
    generatedAt: '2026-05-22T16:10:00Z',
    recommendationId: 'rec-spatial-transcriptomics-protocol',
    paths: [
      {
        id: 'path-spatial-protocol',
        from: 'protocol-spatial-v2',
        to: 'dataset-spatial-lung',
        rank: 2,
        nodes: [
          {id: 'protocol-spatial-v2', type: 'protocol', title: 'Spatial transcriptomics v2'},
          {id: 'dataset-spatial-lung', type: 'dataset', title: 'Lung atlas matrix', format: {name: 'loom', version: '3.0.0'}},
        ],
        software: [
          {name: 'python', installed: '3.11.6', required: '>=3.10 <3.12', source: 'runtime'},
          {name: 'loompy', installed: '3.0.7', required: '>=3.0 <4.0', source: 'environment.yml'},
        ],
        containers: [{image: 'ghcr.io/scibase/spatial', tag: '2026-02', digest: 'sha256:1234'}],
        workflows: [{engine: 'snakemake', installed: '8.5.3', required: '>=8.0 <9.0'}],
        evidence: [{type: 'lockfile', id: 'poetry.lock', present: false}, {type: 'runtime-capture', id: 'runner-991', capturedAt: '2025-08-01'}],
      },
    ],
  },
  {
    name: 'CRISPR screen graph path is ready for discovery',
    generatedAt: '2026-05-22T16:20:00Z',
    recommendationId: 'rec-crispr-screen-dataset',
    paths: [
      {
        id: 'path-crispr-screen',
        from: 'concept-crispr-screen',
        to: 'dataset-crispr-2026',
        rank: 1,
        nodes: [
          {id: 'concept-crispr-screen', type: 'concept', title: 'CRISPR pooled screen'},
          {id: 'dataset-crispr-2026', type: 'dataset', title: 'CRISPR screen 2026', format: {name: 'zarr', version: '2.16.1'}},
        ],
        software: [
          {name: 'python', installed: '3.11.8', required: '>=3.10 <3.12', source: 'runtime'},
          {name: 'zarr', installed: '2.16.1', required: '>=2.15 <3.0', source: 'lockfile'},
          {name: 'pandas', installed: '2.2.2', required: '>=2.1 <3.0', source: 'lockfile'},
        ],
        containers: [{image: 'ghcr.io/scibase/crispr', tag: '2026-05', digest: 'sha256:abcdef'}],
        workflows: [{engine: 'nextflow', installed: '23.10.1', required: '>=23.10 <24.0'}],
        evidence: [{type: 'lockfile', id: 'poetry.lock', present: true}, {type: 'runtime-capture', id: 'runner-1201', capturedAt: '2026-05-12'}],
      },
    ],
  },
];

module.exports = {scenarios};
