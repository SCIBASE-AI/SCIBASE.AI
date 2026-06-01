"use strict";

const assert = require("node:assert/strict");
const {
  evaluateSampleCustodyGraph,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateSampleCustodyGraph(cleanPacket, { now: "2026-06-01T10:45:00.000Z" });
assert.equal(clean.status, "READY");
assert.equal(clean.findings.length, 0);
assert.equal(clean.safeEdges.length, 1);
assert.equal(clean.heldEdges.length, 0);

const risky = evaluateSampleCustodyGraph(riskyPacket, { now: "2026-06-01T10:45:00.000Z" });
const codes = new Set(risky.findings.map((finding) => finding.code));
assert.equal(risky.status, "HOLD");
assert.ok(codes.has("COLLECTION_TO_PRESERVATION_DELAY"));
assert.ok(codes.has("CUSTODY_HANDOFF_INCOMPLETE"));
assert.ok(codes.has("CUSTODY_CHAIN_BREAK"));
assert.ok(codes.has("COLD_CHAIN_TEMPERATURE_EXCURSION"));
assert.ok(codes.has("FREEZE_THAW_LIMIT_EXCEEDED"));
assert.ok(codes.has("SAMPLE_INTEGRITY_BELOW_THRESHOLD"));
assert.ok(codes.has("PRESERVATION_PROTOCOL_MISSING"));
assert.ok(codes.has("CUSTODY_CHAIN_MISSING"));
assert.ok(codes.has("TEMPERATURE_LOG_MISSING"));
assert.ok(codes.has("REQUIRED_SAMPLE_GRAPH_EDGE_MISSING"));
assert.equal(risky.safeEdges.length, 0);
assert.equal(risky.heldEdges.length, 2);

const repeatedRisky = evaluateSampleCustodyGraph(riskyPacket, { now: "2026-06-01T10:50:00.000Z" });
assert.equal(risky.fingerprint, repeatedRisky.fingerprint);

const markdown = renderMarkdownReport(risky, riskyPacket);
assert.match(markdown, /Sample Custody Quality Graph Guard/);
assert.match(markdown, /COLD_CHAIN_TEMPERATURE_EXCURSION/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Sample custody graph guard/);
assert.match(svg, /Status HOLD/);

assert.throws(() => evaluateSampleCustodyGraph(null), /expects a packet object/);

console.log("All sample custody graph guard tests passed.");
