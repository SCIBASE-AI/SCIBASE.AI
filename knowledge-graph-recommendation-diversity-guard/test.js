const assert = require('assert');
const { evaluateRecommendationDiversity } = require('./index');
const { biasedRecommendationSet, buildBalancedRecommendationSet } = require('./sample-data');

function testBiasedSetIsHeld() {
  const result = evaluateRecommendationDiversity(biasedRecommendationSet);
  assert.strictEqual(result.status, 'hold');
  assert(result.blockers.includes('institution_concentration'));
  assert(result.blockers.includes('funder_concentration'));
  assert(result.blockers.includes('method_concentration'));
  assert(result.blockers.includes('stale_evidence_dominance'));
  assert(result.blockers.includes('rec-1_insufficient_rationale_edges'));
}

function testBalancedSetCanShow() {
  const result = evaluateRecommendationDiversity(buildBalancedRecommendationSet());
  assert.strictEqual(result.status, 'show');
  assert.strictEqual(result.blockers.length, 0);
  assert.strictEqual(result.warnings.length, 0);
  assert.strictEqual(result.showableRecommendations, 5);
}

function testTooFewRecommendationsBlocks() {
  const data = buildBalancedRecommendationSet();
  data.recommendationSet.recommendations = data.recommendationSet.recommendations.slice(0, 3);
  const result = evaluateRecommendationDiversity(data);
  assert.strictEqual(result.status, 'hold');
  assert(result.blockers.includes('too_few_showable_recommendations'));
}

function testSuppressedSourceBlocksItem() {
  const data = buildBalancedRecommendationSet();
  data.recommendationSet.recommendations[4].suppressed = true;
  const result = evaluateRecommendationDiversity(data);
  assert.strictEqual(result.status, 'hold');
  assert(result.blockers.includes('rec-5_already_suppressed_source'));
}

function testDigestIsStable() {
  const first = evaluateRecommendationDiversity(buildBalancedRecommendationSet()).auditDigest;
  const second = evaluateRecommendationDiversity(buildBalancedRecommendationSet()).auditDigest;
  assert.strictEqual(first, second);
  assert.strictEqual(first.length, 64);
}

testBiasedSetIsHeld();
testBalancedSetCanShow();
testTooFewRecommendationsBlocks();
testSuppressedSourceBlocksItem();
testDigestIsStable();

console.log('5 knowledge graph recommendation diversity guard tests passed');
