"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  analyzePacket,
  analyzeEntitlementDeliveryPackets,
  contractEntitlements,
  deliveryEntitlements,
  compareQuotas,
  hasEvidenceHash,
  termStatus
} = require("../src");
const samples = require("../data/sample_entitlement_delivery_packets.json");

test("releases a contract when delivery matches every purchased entitlement", () => {
  const packet = samples.find((item) => item.id === "revenue-release-001");
  const result = analyzePacket(packet);
  assert.equal(hasEvidenceHash(packet), true);
  assert.equal(result.decision, "RELEASE_REVENUE");
  assert.equal(result.findings.length, 0);
});

test("holds active billing when delivery evidence and quotas are missing", () => {
  const result = analyzePacket(samples.find((item) => item.id === "revenue-hold-002"));
  assert.equal(result.decision, "HOLD_REVENUE");
  assert.ok(result.findings.some((item) => item.code === "DELIVERY_EVIDENCE_HASH_MISSING"));
  assert.ok(result.findings.some((item) => item.code === "ENTITLEMENT_UNDER_DELIVERED"));
  assert.ok(result.findings.some((item) => item.code === "LICENSED_FEED_NOT_ENABLED"));
  assert.ok(result.findings.some((item) => item.code === "REVENUE_RECOGNITION_NOT_HELD_FOR_DELIVERY_RISK"));
});

test("routes over-provisioned expansions for review when revenue is held", () => {
  const result = analyzePacket(samples.find((item) => item.id === "revenue-review-003"));
  assert.equal(result.decision, "REVIEW_REVENUE");
  assert.ok(result.findings.some((item) => item.code === "ENTITLEMENT_OVER_PROVISIONED"));
  assert.ok(result.findings.some((item) => item.code === "UNPURCHASED_FEED_ENABLED"));
});

test("detects delivery outside the active contract term", () => {
  const packet = samples.find((item) => item.id === "revenue-hold-004");
  const result = analyzePacket(packet);
  assert.equal(termStatus(packet), "after_term");
  assert.equal(result.decision, "HOLD_REVENUE");
  assert.ok(result.findings.some((item) => item.code === "DELIVERY_DATE_OUTSIDE_CONTRACT_TERM"));
});

test("compares purchased and provisioned quotas", () => {
  const packet = samples.find((item) => item.id === "revenue-hold-002");
  const expected = contractEntitlements(packet);
  const actual = deliveryEntitlements(packet);
  const deltas = compareQuotas(expected, actual);
  assert.ok(deltas.some((item) => item.field === "seats" && item.direction === "under" && item.delta === 13));
  assert.ok(deltas.some((item) => item.field === "apiCalls" && item.direction === "under" && item.delta === 50000));
});

test("normalizes purchased data feeds and highest support tier", () => {
  const expected = contractEntitlements(samples.find((item) => item.id === "revenue-release-001"));
  assert.deepEqual(expected.dataFeeds, ["analytics-digest"]);
  assert.equal(expected.supportTier, "enterprise");
});

test("aggregates entitlement delivery decisions", () => {
  const report = analyzeEntitlementDeliveryPackets(samples);
  assert.equal(report.totalPackets, 4);
  assert.deepEqual(report.counts, { RELEASE_REVENUE: 1, REVIEW_REVENUE: 1, HOLD_REVENUE: 2 });
});
