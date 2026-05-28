const assert = require('assert');

const {
  buildDiscoveryPacket,
  reviewKnowledgeGraphSignals
} = require('./index');

const graph = {
  id: 'kg-null-gap-17',
  title: 'Neuroimmune Discovery Graph',
  reviewDate: '2026-05-28',
  edges: [
    {
      id: 'edge-positive',
      source: 'CRISPR protocol A',
      relation: 'supports',
      target: 'neuronal clustering assay',
      recommendationCandidate: true,
      surfacesNegativeEvidence: true,
      evidence: [
        { polarity: 'positive', doi: '10.0000/kg.positive.1', context: 'replicated assay' },
        { polarity: 'positive', doi: '10.0000/kg.positive.2', context: 'independent lab' }
      ],
      auditLog: 'curator scientist@example.edu accepted candidate'
    },
    {
      id: 'edge-mixed-hidden',
      source: 'Model X',
      relation: 'predicts',
      target: 'therapy response Y',
      recommendationCandidate: true,
      surfacesNegativeEvidence: false,
      evidence: [
        { polarity: 'positive', doi: '10.0000/kg.positive.3', context: 'training cohort' },
        { polarity: 'null', doi: '', context: '' },
        { polarity: 'failed-replication', doi: '10.0000/kg.replication.fail', context: 'external cohort' }
      ],
      auditLog: 'token=kg-secret reviewer scientist@example.edu hid null result'
    }
  ],
  intersections: [
    {
      id: 'gap-neuroimmune-materials',
      concepts: ['neuroimmune marker', 'biomaterial scaffold'],
      citationCount: 2,
      unresolvedQuestions: ['Does scaffold porosity change marker expression?'],
      surfacedAsGap: false
    }
  ]
};

const review = reviewKnowledgeGraphSignals(graph);

assert.strictEqual(review.edgeCount, 2);
assert.strictEqual(review.holdCount, 1);
assert.strictEqual(review.readyCount, 1);
assert.strictEqual(review.knowledgeGapCount, 1);
assert.ok(review.digest.startsWith('sha256:'));

const positive = review.edgeReviews.find((edge) => edge.edgeId === 'edge-positive');
assert.strictEqual(positive.decision, 'ready');
assert.deepStrictEqual(positive.holds, []);
assert.strictEqual(positive.actions.surfaceRecommendation, true);

const mixed = review.edgeReviews.find((edge) => edge.edgeId === 'edge-mixed-hidden');
assert.strictEqual(mixed.decision, 'hold');
assert.ok(mixed.holds.includes('negative-evidence-hidden'));
assert.ok(mixed.holds.includes('failed-replication-present'));
assert.ok(mixed.holds.includes('null-result-missing-citation'));
assert.ok(mixed.holds.includes('null-result-missing-context'));
assert.strictEqual(mixed.actions.surfaceRecommendation, false);
assert.strictEqual(mixed.actions.attachNullResultSummary, true);

const gap = review.knowledgeGapReviews[0];
assert.strictEqual(gap.decision, 'surface-gap');
assert.ok(gap.actions.includes('surface-underexplored-intersection'));

const packet = buildDiscoveryPacket(graph, review);
const serialized = JSON.stringify(packet);
assert.ok(!serialized.includes('scientist@example.edu'));
assert.ok(!serialized.includes('kg-secret'));
assert.deepStrictEqual(packet.summary, { ready: 1, hold: 1, gaps: 1 });

console.log('knowledge-graph-null-result-gap-guard tests passed');
