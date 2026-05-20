"use strict";

const assert = require("assert");
const { createReviewPacket, evaluateItem, CONTROLS } = require("./index");
const { samplePacket } = require("./sample-data");

function runTests() {
  assert.strictEqual(CONTROLS.length, 5, "all controls should be registered");
  const packet = createReviewPacket(samplePacket);
  assert.strictEqual(packet.heldItems.length, 2, "sample held count should be deterministic");
  assert(packet.reviewerActions.length >= packet.heldItems.length, "held items should create reviewer actions");
  const cleanItem = samplePacket.items.find((item) => evaluateItem(item).status === "ready");
  assert(cleanItem, "sample data should include at least one ready item");
  const heldItem = samplePacket.items.find((item) => evaluateItem(item).status === "held");
  assert(heldItem, "sample data should include at least one held item");
}

if (require.main === module) {
  runTests();
  console.log("repository-metadata-release-readiness-gate tests passed");
}

module.exports = { runTests };
