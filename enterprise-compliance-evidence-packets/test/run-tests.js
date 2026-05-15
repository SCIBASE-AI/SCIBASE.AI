"use strict";

const assert = require("node:assert/strict");
const sample = require("../examples/institution-projects.json");
const {
  buildEvidencePackets,
  createWebhookEnvelope,
  hashObject,
  renderMarkdown
} = require("../src");

const result = buildEvidencePackets(sample);

assert.equal(result.institution, "Northbridge Research Office");
assert.equal(result.dashboard.totalProjects, 3);
assert.equal(result.dashboard.ready, 1);
assert.equal(result.dashboard.needsReview, 1);
assert.equal(result.dashboard.blocked, 1);

const readyPacket = result.packets.find((packet) => packet.projectId === "P-1001");
const reviewPacket = result.packets.find((packet) => packet.projectId === "P-1002");
const blockedPacket = result.packets.find((packet) => packet.projectId === "P-1003");

assert.equal(readyPacket.status, "ready");
assert.equal(readyPacket.gaps.length, 0);
assert.equal(reviewPacket.status, "needs_review");
assert.ok(reviewPacket.gaps.some((gap) => gap.code === "reproducibility"));
assert.ok(reviewPacket.gaps.some((gap) => gap.code === "export_preprint"));
assert.equal(blockedPacket.status, "blocked");
assert.ok(blockedPacket.gaps.some((gap) => gap.code === "open_access"));
assert.ok(blockedPacket.gaps.some((gap) => gap.code === "data_availability"));

const rerun = buildEvidencePackets(sample);
assert.equal(readyPacket.evidenceDigest, rerun.packets[0].evidenceDigest);
assert.equal(readyPacket.packetDigest, rerun.packets[0].packetDigest);

const signed = createWebhookEnvelope(readyPacket, { secret: "enterprise-secret" });
const unsigned = createWebhookEnvelope(readyPacket);
assert.equal(signed.payload.projectId, "P-1001");
assert.equal(typeof signed.signature, "string");
assert.equal(signed.signature.length, 64);
assert.equal(unsigned.signature, undefined);

const changedSample = structuredClone(sample);
changedSample.projects[0].evidence.reproducibilityScore = 0.5;
const changed = buildEvidencePackets(changedSample);
assert.notEqual(readyPacket.evidenceDigest, changed.packets[0].evidenceDigest);

const markdown = renderMarkdown(result);
assert.match(markdown, /Enterprise Compliance Evidence Packets/);
assert.match(markdown, /Single-cell markers/);

assert.equal(
  hashObject({ b: 1, a: 2 }),
  hashObject({ a: 2, b: 1 }),
  "hashing must be stable for reordered object keys"
);

console.log("All enterprise compliance evidence packet tests passed.");
