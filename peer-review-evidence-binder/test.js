const assert = require('assert');
const { packets } = require('./sample-data');
const { evaluateReviewPacket, evaluatePackets, formatMarkdown, formatSvg } = require('./index');

function testUnsafeReviewPacketIsHeld() {
  const review = evaluateReviewPacket(packets[0]);
  assert.strictEqual(review.decision, 'hold');
  assert(review.findings.some((finding) => finding.code === 'review_comment_missing_evidence'));
  assert(review.findings.some((finding) => finding.code === 'unsupported_accusation_language'));
  assert(review.findings.some((finding) => finding.code === 'private_review_note_leak'));
  assert(review.findings.some((finding) => finding.code === 'blind_review_identity_leak'));
}

function testIncompletePacketRequiresRevision() {
  const review = evaluateReviewPacket(packets[1]);
  assert.strictEqual(review.decision, 'revise');
  assert(review.findings.some((finding) => finding.code === 'low_confidence_blocker'));
  assert(review.findings.some((finding) => finding.code === 'missing_actionable_remediation'));
}

function testCleanPacketCanRelease() {
  const review = evaluateReviewPacket(packets[2]);
  assert.strictEqual(review.decision, 'release');
  assert.strictEqual(review.findings.length, 0);
  assert.deepStrictEqual(review.releaseActions, ['Release AI review packet to authors with audit digest attached.']);
}

function testPacketAndFormats() {
  const packet = evaluatePackets(packets);
  assert.strictEqual(packet.overallDecision, 'hold');
  assert.strictEqual(packet.reviews.length, 3);
  assert.match(packet.packetDigest, /^[a-f0-9]{16}$/);
  assert(formatMarkdown(packet).includes('AI Peer Review Evidence Binder Report'));
  assert(formatSvg(packet).includes('<svg'));
}

const tests = [
  testUnsafeReviewPacketIsHeld,
  testIncompletePacketRequiresRevision,
  testCleanPacketCanRelease,
  testPacketAndFormats
];

for (const test of tests) {
  test();
  console.log(`ok - ${test.name}`);
}

console.log(`${tests.length} tests passed`);
