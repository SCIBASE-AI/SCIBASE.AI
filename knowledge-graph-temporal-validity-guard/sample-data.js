const temporalValidGraph = {
  graphId: 'kg-temporal-2026-05',
  asOf: '2026-05-23',
  nodes: [
    {id: 'paper-crispr-2026', type: 'paper', validFrom: '2026-01-01', validUntil: null, version: 'v1'},
    {id: 'dataset-scrna-v3', type: 'dataset', validFrom: '2026-02-01', validUntil: null, version: 'v3'},
    {id: 'method-scrna-normalization-v2', type: 'method', validFrom: '2026-03-01', validUntil: null, version: 'v2'},
    {id: 'author-lee', type: 'author', validFrom: '2021-01-01', validUntil: null, version: 'v4'},
    {id: 'institution-northstar', type: 'institution', validFrom: '2020-01-01', validUntil: null, version: 'v2'},
  ],
  edges: [
    {id: 'edge-paper-dataset', from: 'paper-crispr-2026', to: 'dataset-scrna-v3', type: 'uses-dataset', validFrom: '2026-02-15', validUntil: null, evidenceVersion: 'v3'},
    {id: 'edge-paper-method', from: 'paper-crispr-2026', to: 'method-scrna-normalization-v2', type: 'uses-method', validFrom: '2026-03-15', validUntil: null, evidenceVersion: 'v2'},
    {id: 'edge-author-affiliation', from: 'author-lee', to: 'institution-northstar', type: 'affiliated-with', validFrom: '2025-01-01', validUntil: null, evidenceVersion: 'v2'},
  ],
  recommendations: [
    {
      id: 'rec-crispr-single-cell',
      title: 'Recommend CRISPR single-cell workflow',
      path: ['paper-crispr-2026', 'dataset-scrna-v3', 'method-scrna-normalization-v2'],
      edgeIds: ['edge-paper-dataset', 'edge-paper-method'],
    },
  ],
};

const temporalRiskGraph = {
  ...temporalValidGraph,
  graphId: 'kg-temporal-review-2026-05',
  nodes: [
    {id: 'paper-crispr-2026', type: 'paper', validFrom: '2026-01-01', validUntil: null, version: 'v1'},
    {id: 'dataset-scrna-v2', type: 'dataset', validFrom: '2025-01-01', validUntil: '2026-04-15', version: 'v2'},
    {id: 'dataset-scrna-v4', type: 'dataset', validFrom: '2026-08-01', validUntil: null, version: 'v4'},
    {id: 'method-scrna-normalization-v2', type: 'method', validFrom: '2026-03-01', validUntil: null, version: 'v2'},
    {id: 'author-lee', type: 'author', validFrom: '2021-01-01', validUntil: null, version: 'v4'},
    {id: 'institution-old-lab', type: 'institution', validFrom: '2020-01-01', validUntil: null, version: 'v1'},
  ],
  edges: [
    {id: 'edge-expired-dataset', from: 'paper-crispr-2026', to: 'dataset-scrna-v2', type: 'uses-dataset', validFrom: '2025-02-15', validUntil: '2026-04-01', evidenceVersion: 'v1'},
    {id: 'edge-future-dataset', from: 'paper-crispr-2026', to: 'dataset-scrna-v4', type: 'uses-dataset', validFrom: '2026-08-02', validUntil: null, evidenceVersion: 'v4'},
    {id: 'edge-paper-method', from: 'paper-crispr-2026', to: 'method-scrna-normalization-v2', type: 'uses-method', validFrom: '2026-03-15', validUntil: null, evidenceVersion: 'v1'},
    {id: 'edge-author-affiliation', from: 'author-lee', to: 'institution-old-lab', type: 'affiliated-with', validFrom: '2023-01-01', validUntil: '2026-01-31', evidenceVersion: 'v1'},
  ],
  recommendations: [
    {
      id: 'rec-risky-crispr',
      title: 'Recommend stale CRISPR dataset workflow',
      path: ['paper-crispr-2026', 'dataset-scrna-v2', 'method-scrna-normalization-v2'],
      edgeIds: ['edge-expired-dataset', 'edge-paper-method'],
    },
    {
      id: 'rec-future-dataset',
      title: 'Recommend future dataset release',
      path: ['paper-crispr-2026', 'dataset-scrna-v4'],
      edgeIds: ['edge-future-dataset'],
    },
  ],
};

module.exports = {
  temporalValidGraph,
  temporalRiskGraph,
};
