const assert = require('node:assert/strict');
const {analyzeTemporalGraph} = require('./index');

const baseGraph = {
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

const clone = (value) => JSON.parse(JSON.stringify(value));

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test('suppresses recommendations that traverse expired edges or nodes', () => {
  const graph = clone(baseGraph);
  graph.edges[0].validUntil = '2026-04-01';
  graph.nodes[1].validUntil = '2026-04-15';

  const result = analyzeTemporalGraph(graph);

  assert.equal(result.status, 'hold_temporal_review');
  assert(result.findings.some((finding) => finding.code === 'EDGE_EXPIRED'));
  assert(result.findings.some((finding) => finding.code === 'NODE_EXPIRED'));
  assert.equal(result.recommendationDecisions[0].decision, 'suppress');
});

test('holds future-dated graph objects before entity pages use them', () => {
  const graph = clone(baseGraph);
  graph.nodes.push({id: 'dataset-future-v4', type: 'dataset', validFrom: '2026-08-01', validUntil: null, version: 'v4'});
  graph.edges.push({id: 'edge-future', from: 'paper-crispr-2026', to: 'dataset-future-v4', type: 'uses-dataset', validFrom: '2026-08-02', validUntil: null, evidenceVersion: 'v4'});
  graph.recommendations[0].path.push('dataset-future-v4');
  graph.recommendations[0].edgeIds.push('edge-future');

  const result = analyzeTemporalGraph(graph);

  assert.equal(result.status, 'hold_temporal_review');
  assert(result.findings.some((finding) => finding.code === 'NODE_NOT_YET_EFFECTIVE'));
  assert(result.findings.some((finding) => finding.code === 'EDGE_NOT_YET_EFFECTIVE'));
});

test('flags relationship evidence version drift before graph publication', () => {
  const graph = clone(baseGraph);
  graph.edges[1].evidenceVersion = 'v1';

  const result = analyzeTemporalGraph(graph);

  assert.equal(result.status, 'hold_temporal_review');
  assert(result.findings.some((finding) => finding.code === 'EVIDENCE_VERSION_DRIFT'));
  assert.equal(result.summary.versionDrift, 1);
});

test('routes expired affiliations to curator review without suppressing unrelated recommendations', () => {
  const graph = clone(baseGraph);
  graph.edges[2].validUntil = '2026-01-31';

  const result = analyzeTemporalGraph(graph);

  assert.equal(result.status, 'needs_curator_review');
  assert(result.findings.some((finding) => finding.code === 'AFFILIATION_EXPIRED'));
  assert.equal(result.recommendationDecisions[0].decision, 'publish');
});

test('returns ready status and deterministic digest for temporally valid graph packets', () => {
  const first = analyzeTemporalGraph(clone(baseGraph));
  const second = analyzeTemporalGraph(clone(baseGraph));

  assert.equal(first.status, 'temporal_ready');
  assert.equal(first.summary.blockers, 0);
  assert.match(first.digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.digest, second.digest);
});
