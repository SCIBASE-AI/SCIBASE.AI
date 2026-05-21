"use strict";

const assert = require("node:assert/strict");
const { buildAwardTransparencyPacket } = require("./index");
const { challenge } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testPublishReadyPacket() {
  const packet = buildAwardTransparencyPacket(clone(challenge));

  assert.equal(packet.status, "publish_ready");
  assert.deepEqual(packet.blockers, []);
  assert.equal(packet.announcement.rankedResults.length, 3);
  assert.equal(packet.announcement.rankedResults[0].displayName, "Northstar Lab");
  assert.equal(packet.announcement.rankedResults[1].displayName, "Private finalist BETA");
  assert.equal(packet.announcement.escrow.plannedAwardUsd, 1000);
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

function testEscrowShortfallBlocksPublication() {
  const data = clone(challenge);
  data.escrow.clearedUsd = 900;

  const packet = buildAwardTransparencyPacket(data);

  assert.equal(packet.status, "hold");
  assert(packet.blockers.some((blocker) => blocker.includes("exceeds_cleared_escrow")));
}

function testAppealAndNoticeFailuresBlockPublication() {
  const data = clone(challenge);
  delete data.appeals.closesAt;
  data.notifications = data.notifications.filter((notice) => notice.submissionId !== "sub-gamma");

  const packet = buildAwardTransparencyPacket(data);

  assert.equal(packet.status, "hold");
  assert(packet.blockers.includes("missing_valid_appeal_window_close"));
  assert(packet.blockers.includes("missing_solver_result_notice_sub-gamma"));
}

function testPrivateIpDisclosureBlocksPublication() {
  const data = clone(challenge);
  data.publicPreviewArtifacts[1].redacted = false;

  const packet = buildAwardTransparencyPacket(data);

  assert.equal(packet.status, "hold");
  assert(packet.blockers.includes("unredacted_private_ip_artifact_artifact-beta-methods-preview"));
}

function testReviewerConflictBlocksPublication() {
  const data = clone(challenge);
  data.reviewers[1].conflictStatus = "unresolved";

  const packet = buildAwardTransparencyPacket(data);

  assert.equal(packet.status, "hold");
  assert(packet.blockers.includes("unresolved_reviewer_conflict_rev-clinical"));
}

const tests = [
  testPublishReadyPacket,
  testEscrowShortfallBlocksPublication,
  testAppealAndNoticeFailuresBlockPublication,
  testPrivateIpDisclosureBlocksPublication,
  testReviewerConflictBlocksPublication,
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} challenge award transparency guard tests passed`);
