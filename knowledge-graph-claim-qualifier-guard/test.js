const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  evaluateClaimQualifiers,
  buildMarkdownReport,
  buildSvgSummary,
  writeReportBundle
} = require("./index");
const { riskyPacket, cleanPacket } = require("./sample-data");

function testCausalOverclaimBlocked() {
  const result = evaluateClaimQualifiers(riskyPacket);
  assert.strictEqual(result.status, "hold_claim_edges");
  assert(result.curatorPacket.blockers.some((blocker) => blocker.kind === "causal_overclaim_from_association"));
  assert(result.curatorPacket.blockers.some((blocker) => blocker.kind === "unsupported_recommendation_language"));
  assert(result.curatorPacket.heldEdges.includes("edge-overclaim-001"));
}

function testNegativePolarityBlocked() {
  const result = evaluateClaimQualifiers(riskyPacket);
  const blocker = result.curatorPacket.blockers.find((entry) => entry.kind === "missing_negative_result_polarity");
  assert(blocker, "expected missing negative polarity blocker");
  assert.strictEqual(blocker.edgeId, "edge-negative-002");
}

function testMissingContextWarns() {
  const result = evaluateClaimQualifiers(riskyPacket);
  const warning = result.curatorPacket.warnings.find((entry) => entry.kind === "missing_experimental_context");
  assert(warning, "expected missing context warning");
  assert(warning.evidence.missing.includes("assay"));
}

function testCleanPacketPublishes() {
  const result = evaluateClaimQualifiers(cleanPacket);
  assert.strictEqual(result.status, "graph_edges_ready");
  assert.strictEqual(result.summary.blockers, 0);
  assert.strictEqual(result.curatorPacket.publishableEdges.length, 1);
}

function testReportsRender() {
  const result = evaluateClaimQualifiers(riskyPacket);
  const markdown = buildMarkdownReport(result);
  const svg = buildSvgSummary(result);
  assert(markdown.includes("Knowledge Graph Claim Qualifier Guard Report"));
  assert(markdown.includes("hold_claim_edges"));
  assert(svg.includes("<svg"));
  assert(svg.includes("Knowledge Graph Claim Qualifier Guard"));

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "kg-claim-"));
  const paths = writeReportBundle(result, outputDir);
  assert(fs.existsSync(paths.jsonPath));
  assert(fs.existsSync(paths.markdownPath));
  assert(fs.existsSync(paths.svgPath));
}

function run() {
  testCausalOverclaimBlocked();
  testNegativePolarityBlocked();
  testMissingContextWarns();
  testCleanPacketPublishes();
  testReportsRender();
  console.log("5 knowledge graph claim qualifier tests passed");
}

run();
