const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  evaluateReviewCivility,
  buildMarkdownReport,
  buildSvgSummary,
  writeReportBundle
} = require("./index");
const { samplePacket, cleanPacket } = require("./sample-data");

function testHoldsHarassmentAndUnsupportedScore() {
  const result = evaluateReviewCivility(samplePacket);
  assert.strictEqual(result.status, "hold_review_publication");
  assert(result.moderationPacket.blockers.some((issue) => issue.kind === "harassment_or_personal_attack"));
  assert(result.moderationPacket.blockers.some((issue) => issue.kind === "unsupported_reputation_damaging_score"));
  assert(result.moderationPacket.withheldItems.includes("review-toxic-001"));
}

function testBlocksAnonymousReviewerLeak() {
  const result = evaluateReviewCivility(samplePacket);
  const leak = result.moderationPacket.blockers.find(
    (issue) => issue.kind === "anonymous_reviewer_identity_leak" && issue.itemId === "review-blind-leak-002"
  );
  assert(leak, "expected double-blind identity leak blocker");
  assert(leak.evidence.hints.some((hint) => String(hint).includes("Elena")));
}

function testRedactsProtectedIdentityInComments() {
  const result = evaluateReviewCivility(samplePacket);
  const redaction = result.moderationPacket.redactions.find((entry) => entry.itemId === "comment-private-001");
  assert(redaction, "expected comment redaction");
  assert(redaction.terms.includes("personal email"));
  assert(redaction.terms.includes("visa status"));
}

function testCleanPacketPublishes() {
  const result = evaluateReviewCivility(cleanPacket);
  assert.strictEqual(result.status, "community_ready");
  assert.strictEqual(result.summary.blockers, 0);
  assert.strictEqual(result.summary.warnings, 0);
  assert.strictEqual(result.moderationPacket.recommendation, "Safe to publish and apply profile/timeline credit.");
}

function testReportsRender() {
  const result = evaluateReviewCivility(samplePacket);
  const markdown = buildMarkdownReport(result);
  const svg = buildSvgSummary(result);
  assert(markdown.includes("Peer Review Civility And Evidence Gate Report"));
  assert(markdown.includes("hold_review_publication"));
  assert(svg.includes("<svg"));
  assert(svg.includes("Peer Review Civility And Evidence Gate"));

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "civility-gate-"));
  const paths = writeReportBundle(result, outputDir);
  assert(fs.existsSync(paths.jsonPath));
  assert(fs.existsSync(paths.markdownPath));
  assert(fs.existsSync(paths.svgPath));
}

function run() {
  testHoldsHarassmentAndUnsupportedScore();
  testBlocksAnonymousReviewerLeak();
  testRedactsProtectedIdentityInComments();
  testCleanPacketPublishes();
  testReportsRender();
  console.log("5 review civility evidence gate tests passed");
}

run();
