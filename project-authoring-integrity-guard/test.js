const assert = require('assert');
const { bundles } = require('./sample-data');
const { evaluateProjectAuthoringBundle, evaluateBundles, formatMarkdown, formatSvg } = require('./index');

function testUnsafeBundleIsHeld() {
  const review = evaluateProjectAuthoringBundle(bundles[0]);
  assert.strictEqual(review.decision, 'hold');
  assert(review.findings.some((finding) => finding.code === 'stale_notebook_code'));
  assert(review.findings.some((finding) => finding.code === 'stale_notebook_dataset'));
  assert(review.findings.some((finding) => finding.code === 'restricted_dataset_public_reference'));
  assert(review.findings.some((finding) => finding.code === 'citation_contributor_not_attribution_ready'));
}

function testMetadataGapsRequireReview() {
  const review = evaluateProjectAuthoringBundle(bundles[1]);
  assert.strictEqual(review.decision, 'review');
  assert(review.findings.some((finding) => finding.code === 'artifact_missing_source_checksum'));
  assert(review.findings.some((finding) => finding.code === 'missing_license'));
  assert(review.findings.some((finding) => finding.code === 'missing_funding_sources'));
}

function testCleanBundleIsAllowed() {
  const review = evaluateProjectAuthoringBundle(bundles[2]);
  assert.strictEqual(review.decision, 'allow');
  assert.strictEqual(review.findings.length, 0);
}

function testPacketAndFormats() {
  const packet = evaluateBundles(bundles);
  assert.strictEqual(packet.overallDecision, 'hold');
  assert.strictEqual(packet.reviews.length, 3);
  assert.match(packet.packetDigest, /^[a-f0-9]{16}$/);
  assert(formatMarkdown(packet).includes('Project Authoring Integrity Review'));
  assert(formatSvg(packet).includes('<svg'));
}

const tests = [
  testUnsafeBundleIsHeld,
  testMetadataGapsRequireReview,
  testCleanBundleIsAllowed,
  testPacketAndFormats
];

for (const test of tests) {
  test();
  console.log(`ok - ${test.name}`);
}

console.log(`${tests.length} tests passed`);
