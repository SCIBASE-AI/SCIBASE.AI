'use strict';

const assert = require('assert/strict');
const { evaluateFundingCoiInfluenceGraph, digest } = require('./index');
const sample = require('./sample-data');

function testPublishesCleanGraph() {
  const result = evaluateFundingCoiInfluenceGraph(sample.cleanGraph);

  assert.equal(result.decision, 'publish');
  assert.equal(result.summary.publish, 1);
  assert.equal(result.recommendationHold, false);
}

function testAnnotatesConcentratedFunding() {
  const graph = {
    checkedAt: sample.graph.checkedAt,
    entities: sample.graph.entities.filter((entity) => ['pub-sponsored-assay', 'author-bohr', 'funder-vendor', 'funder-public', 'dataset-open'].includes(entity.id)),
    edges: sample.graph.edges.filter((edge) => ['pub-sponsored-assay', 'author-bohr', 'funder-vendor', 'funder-public', 'dataset-open'].includes(edge.from) || ['pub-sponsored-assay', 'author-bohr', 'funder-vendor', 'funder-public', 'dataset-open'].includes(edge.to)),
  };
  const result = evaluateFundingCoiInfluenceGraph(graph);

  assert.equal(result.decision, 'annotate');
  assert.ok(result.warnings.some((finding) => finding.code === 'funder_concentration_high'));
}

function testQuarantinesSponsorControlledUndisclosedGraph() {
  const graph = {
    checkedAt: sample.graph.checkedAt,
    entities: sample.graph.entities.filter((entity) => ['preprint-device-eval', 'author-curie', 'funder-vendor', 'institution-vendor', 'dataset-sponsored'].includes(entity.id)),
    edges: sample.graph.edges.filter((edge) => ['preprint-device-eval', 'author-curie', 'funder-vendor', 'institution-vendor', 'dataset-sponsored'].includes(edge.from) || ['preprint-device-eval', 'author-curie', 'funder-vendor', 'institution-vendor', 'dataset-sponsored'].includes(edge.to)),
  };
  const result = evaluateFundingCoiInfluenceGraph(graph);

  assert.equal(result.decision, 'quarantine');
  assert.equal(result.recommendationHold, true);
  assert.ok(result.blockers.some((finding) => finding.code === 'risky_funding_undisclosed'));
  assert.ok(result.blockers.some((finding) => finding.code === 'sponsor_controlled_dataset'));
}

function testCombinedSummary() {
  const result = evaluateFundingCoiInfluenceGraph(sample.graph);

  assert.equal(result.decision, 'quarantine');
  assert.equal(result.summary.totalWorks, 3);
  assert.equal(result.summary.publish, 1);
  assert.equal(result.summary.annotate, 1);
  assert.equal(result.summary.quarantine, 1);
}

function testDigestIsDeterministic() {
  const first = evaluateFundingCoiInfluenceGraph(sample.graph);
  const second = evaluateFundingCoiInfluenceGraph(sample.graph);

  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ z: 1, a: 2 }), digest({ a: 2, z: 1 }));
}

function run() {
  testPublishesCleanGraph();
  testAnnotatesConcentratedFunding();
  testQuarantinesSponsorControlledUndisclosedGraph();
  testCombinedSummary();
  testDigestIsDeterministic();
  console.log('funding-coi-influence-graph-guard tests passed');
}

run();
