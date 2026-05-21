"use strict";

const assert = require("node:assert/strict");
const { buildLeaderboardEligibilityPacket } = require("./index");
const { leaderboard } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testLeaderboardHoldsUnsafeCandidateButPublishesSafeRanks() {
  const packet = buildLeaderboardEligibilityPacket(clone(leaderboard));

  assert.equal(packet.status, "hold");
  assert.equal(packet.publishableRanks.length, 3);
  assert.equal(packet.heldCandidates.length, 1);
  assert.equal(packet.heldCandidates[0].userId, "u-mika");
  assert(packet.blockers.includes("u-mika_pending_reputation_appeal"));
  assert(packet.blockers.includes("u-mika_anonymous_review_signal_without_public_consent"));
  assert.match(packet.auditDigest, /^[a-f0-9]{64}$/);
}

function testPublishReadyAfterAppealAndConsentResolved() {
  const data = clone(leaderboard);
  const candidate = data.candidates.find((item) => item.userId === "u-mika");
  candidate.pendingAppeals = 0;
  candidate.publicReviewSignalConsent = true;
  candidate.evidence.push({ id: "ev-17", type: "reproducibility", status: "accepted" });
  candidate.endorsements = [{ from: "u-nora", relationship: "independent" }];

  const packet = buildLeaderboardEligibilityPacket(data);

  assert.equal(packet.status, "publish_ready");
  assert.equal(packet.blockers.length, 0);
  assert.equal(packet.publishableRanks.length, 4);
}

function testInstitutionDominanceBlocksBoard() {
  const data = clone(leaderboard);
  data.policy.maxInstitutionShare = 0.5;
  data.candidates[1].institution = "Northstar University";
  data.candidates[2].institution = "Northstar University";

  const packet = buildLeaderboardEligibilityPacket(data);

  assert.equal(packet.status, "hold");
  assert(packet.blockers.includes("institution_dominance_over_threshold"));
}

function testInsufficientEvidenceBlocksCandidate() {
  const data = clone(leaderboard);
  data.candidates[0].evidence = [{ id: "ev-only", type: "endorsement", status: "accepted" }];

  const packet = buildLeaderboardEligibilityPacket(data);

  assert.equal(packet.status, "hold");
  assert(packet.blockers.includes("u-ada_insufficient_accepted_evidence"));
  assert(packet.blockers.includes("u-ada_insufficient_evidence_diversity"));
}

function testAnonymousPublicDisplayRedactsIdentityWhenEligible() {
  const data = clone(leaderboard);
  data.candidates[3].pendingAppeals = 0;
  data.candidates[3].publicReviewSignalConsent = true;
  data.candidates[3].evidence.push({ id: "ev-17", type: "reproducibility", status: "accepted" });
  data.candidates[3].endorsements = [{ from: "u-nora", relationship: "independent" }];

  const packet = buildLeaderboardEligibilityPacket(data);
  const anonymous = packet.publishableRanks.find((candidate) => candidate.userId === "u-mika");

  assert.equal(anonymous.displayName, "Private reviewer MIKA");
  assert.equal(anonymous.institution, "redacted");
  assert.equal(anonymous.redacted, true);
}

const tests = [
  testLeaderboardHoldsUnsafeCandidateButPublishesSafeRanks,
  testPublishReadyAfterAppealAndConsentResolved,
  testInstitutionDominanceBlocksBoard,
  testInsufficientEvidenceBlocksCandidate,
  testAnonymousPublicDisplayRedactsIdentityWhenEligible,
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} reputation leaderboard eligibility guard tests passed`);
