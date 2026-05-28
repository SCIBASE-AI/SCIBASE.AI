const assert = require("assert");
const {
  auditKnowledgeGraph,
  digest,
  entityKey,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { graphPolicy, readyGraph, riskyGraph } = require("./sample-data");

const risky = auditKnowledgeGraph(riskyGraph, graphPolicy);
assert.strictEqual(risky.decision, "block-graph-publication");
assert.ok(risky.riskScore >= 90, "risky graph should produce a strong block score");
assert.ok(risky.findings.some((item) => item.code === "REQUIRED_ENTITY_TYPE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "ENTITY_IDENTIFIER_INVALID"));
assert.ok(risky.findings.some((item) => item.code === "ENTITY_CONFIDENCE_BELOW_THRESHOLD"));
assert.ok(risky.findings.some((item) => item.code === "PRIVATE_ENTITY_SCOPE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "RELATIONSHIP_ENDPOINT_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "RELATIONSHIP_PROVENANCE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "PRIVATE_CONTENT_EDGE_PUBLIC"));
assert.ok(risky.findings.some((item) => item.code === "PRIVATE_SIGNAL_IN_PUBLIC_RECOMMENDATION"));
assert.ok(risky.findings.some((item) => item.code === "GRAPH_EXPORT_FORMAT_UNSUPPORTED"));
assert.ok(risky.findings.some((item) => item.code === "PUBLIC_GRAPH_LICENSE_MISSING"));

const repeat = auditKnowledgeGraph(riskyGraph, graphPolicy);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const ready = auditKnowledgeGraph(readyGraph, graphPolicy);
assert.strictEqual(ready.decision, "ready-for-graph-publication");
assert.strictEqual(ready.findings.length, 0);
assert.strictEqual(ready.entityCounts.software, 1);

assert.strictEqual(entityKey({ type: "paper", id: "p1" }), "paper:p1");
assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Knowledge Graph Ingestion Audit"));
assert.ok(markdown.includes("Synthetic graph packet only"));
assert.ok(markdown.includes("block-graph-publication"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Knowledge Graph Ingestion Audit"));

console.log("graph-ingestion-auditor tests passed");
