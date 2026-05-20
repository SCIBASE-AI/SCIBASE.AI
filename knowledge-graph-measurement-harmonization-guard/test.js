const assert = require('assert');
const {
  evaluateMeasurementHarmonization,
  buildGraphHarmonizationPacket,
  normalizeMeasurement,
} = require('./index');
const { sampleGraph, harmonizedGraph } = require('./sample-data');

function testMeasurementEdgesAreBlockedWhenNotComparable() {
  const review = evaluateMeasurementHarmonization(sampleGraph);

  assert.equal(review.overallStatus, 'curation_required');
  assert.equal(review.summary.blockingFindings, 4);
  assert.ok(review.findings.some((finding) => finding.code === 'biological_context_mismatch'));
  assert.ok(review.findings.some((finding) => finding.code === 'unit_not_convertible'));
  assert.ok(review.findings.some((finding) => finding.code === 'statistical_endpoint_mismatch'));
  assert.ok(review.findings.some((finding) => finding.code === 'provenance_confidence_low'));
  assert.equal(review.edgeDecisions.find((edge) => edge.edgeId === 'edge-rat-human-pressure').decision, 'suppress_recommendation');
  assert.equal(review.edgeDecisions.find((edge) => edge.edgeId === 'edge-rat-pressure-pa').decision, 'allow_comparison');
}

function testUnitNormalizationIsDeterministic() {
  const normalized = normalizeMeasurement({
    value: 120,
    unit: 'mmHg',
    endpoint: 'systolic_pressure',
  });

  assert.equal(normalized.normalizedUnit, 'Pa');
  assert.equal(normalized.normalizedValue, 15998.64);
  assert.equal(normalized.conversion, 'mmHg_to_Pa');
}

function testGraphPacketIncludesJsonLdAndCuratorActions() {
  const packet = buildGraphHarmonizationPacket(sampleGraph);

  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
  assert.equal(packet.jsonLd['@type'], 'MeasurementHarmonizationReview');
  assert.equal(packet.curatorActions.length, 4);
  assert.deepEqual(
    packet.findings.map((finding) => finding.code),
    [
      'biological_context_mismatch',
      'provenance_confidence_low',
      'statistical_endpoint_mismatch',
      'unit_not_convertible',
    ],
  );
}

function testHarmonizedGraphAllowsRecommendations() {
  const review = evaluateMeasurementHarmonization(harmonizedGraph);

  assert.equal(review.overallStatus, 'ready');
  assert.equal(review.summary.blockingFindings, 0);
  assert.equal(review.edgeDecisions.every((edge) => edge.decision === 'allow_comparison'), true);
}

testMeasurementEdgesAreBlockedWhenNotComparable();
testUnitNormalizationIsDeterministic();
testGraphPacketIncludesJsonLdAndCuratorActions();
testHarmonizedGraphAllowsRecommendations();

console.log('knowledge-graph-measurement-harmonization-guard tests passed');
