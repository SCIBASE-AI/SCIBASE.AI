'use strict';

const assert = require('assert');
const sampleGraph = require('./sample-data');
const {
  daysBetween,
  evaluateGraph,
  evaluateTrial,
  normalizeRegistryId
} = require('./index');

const asOfDate = '2026-05-22';

function testRegistryNormalization() {
  assert.deepEqual(normalizeRegistryId('NCT-01234567'), {
    original: 'NCT-01234567',
    registry: 'clinicaltrials_gov',
    registryId: 'NCT01234567',
    registryKey: 'clinicaltrials_gov:NCT01234567',
    valid: true
  });

  assert.equal(normalizeRegistryId('EUCTR2023-001234-12').registryKey, 'euctr:2023-001234-12');
  assert.equal(normalizeRegistryId('ISRCTN 12345678').registryKey, 'isrctn:ISRCTN12345678');
  assert.equal(normalizeRegistryId('trial-123').valid, false);
}

function testDateHelper() {
  assert.equal(daysBetween('2026-05-01', '2026-05-22'), 21);
}

function testCompletedTrialMissingResultsIsHeld() {
  const packet = evaluateTrial(sampleGraph.trials[0], sampleGraph, { asOfDate });

  assert.equal(packet.registryId, 'NCT01234567');
  assert.equal(packet.action, 'suppress_clinical_recommendations');
  assert.ok(packet.issues.some((issue) => issue.code === 'results_posting_overdue'));
  assert.ok(packet.issues.some((issue) => issue.code === 'endpoint_mismatch'));
  assert.equal(packet.auditDigest.length, 64);
}

function testPhaseThreeMissingProtocolIsHeld() {
  const packet = evaluateTrial(sampleGraph.trials[1], sampleGraph, { asOfDate });

  assert.equal(packet.registry, 'euctr');
  assert.equal(packet.action, 'hold_edges_for_curator_review');
  assert.ok(packet.issues.some((issue) => issue.code === 'missing_protocol_edge'));
  assert.ok(packet.issues.some((issue) => issue.code === 'stale_registry_record'));
  assert.ok(packet.curatorActions.includes('link the registered protocol before allowing publication or dataset graph edges'));
}

function testWithdrawnTrialSuppressesRecommendations() {
  const packet = evaluateTrial(sampleGraph.trials[2], sampleGraph, { asOfDate });

  assert.equal(packet.action, 'suppress_clinical_recommendations');
  assert.equal(packet.severity, 'critical');
  assert.ok(packet.issues.some((issue) => issue.code === 'terminal_trial_recommended'));
}

function testCleanTrialEdgesAreAllowed() {
  const packet = evaluateTrial(sampleGraph.trials[3], sampleGraph, { asOfDate });

  assert.equal(packet.action, 'allow_trial_graph_edges');
  assert.equal(packet.issueCount, 0);
  assert.equal(packet.linkedProtocolCount, 1);
  assert.equal(packet.linkedDatasetCount, 1);
}

function testInvalidRegistryIdentifierSuppressesNode() {
  const packet = evaluateTrial({
    id: 'trial-bad',
    registry: 'clinicaltrials_gov',
    registryId: 'NCT123',
    status: 'recruiting',
    phase: 'phase_2',
    registryUpdatedAt: '2026-05-01',
    primaryEndpoints: ['response rate']
  }, { edges: [] }, { asOfDate });

  assert.equal(packet.registryIdValid, false);
  assert.equal(packet.action, 'suppress_clinical_recommendations');
  assert.ok(packet.issues.some((issue) => issue.code === 'invalid_registry_id'));
}

function testGraphSummary() {
  const graph = evaluateGraph(sampleGraph, { asOfDate });

  assert.equal(graph.trialCount, 4);
  assert.equal(graph.heldTrialCount, 3);
  assert.equal(graph.byAction.suppress_clinical_recommendations, 2);
  assert.equal(graph.byAction.hold_edges_for_curator_review, 1);
  assert.equal(graph.byAction.allow_trial_graph_edges, 1);
  assert.ok(graph.heldTrials.includes('NCT01234567'));
  assert.ok(graph.auditDigest.length === 64);
}

const tests = [
  testRegistryNormalization,
  testDateHelper,
  testCompletedTrialMissingResultsIsHeld,
  testPhaseThreeMissingProtocolIsHeld,
  testWithdrawnTrialSuppressesRecommendations,
  testCleanTrialEdgesAreAllowed,
  testInvalidRegistryIdentifierSuppressesNode,
  testGraphSummary
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} clinical trial registry graph guard tests passed`);
