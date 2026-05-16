const assert = require("assert");
const sample = require("./sample-data.json");
const {
  auditDigest,
  buildPayoutReadinessPacket,
  evaluateContributor,
  normalizeCountry,
  stableJson,
  summarizeForSponsor,
  validateAwardSplits
} = require("./src/eligibilityGate");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testContributorReadiness() {
  const ready = evaluateContributor(sample.team.contributors[0]);
  assert.equal(ready.status, "ready");
  assert.equal(ready.actions.length, 0);

  const blocked = evaluateContributor({
    id: "solver-x",
    displayName: "Solver X",
    country: "zz",
    identityAttested: false,
    payoutMethodVerified: false,
    taxFormStatus: "missing",
    institutionRouting: { required: true, approved: false },
    watchlistStatus: "review-required",
    ipAssignmentConsent: false
  });

  assert.equal(blocked.status, "blocked");
  assert(blocked.actions.some((item) => item.code === "unsupported_payout_country"));
  assert(blocked.actions.some((item) => item.code === "watchlist_review_required"));
  assert(blocked.actions.some((item) => item.code === "ip_release_consent_required"));
}

function testAwardSplitValidation() {
  const splitCheck = validateAwardSplits(sample.team);
  assert.equal(splitCheck.splitTotal, 100);
  assert.equal(splitCheck.actions.length, 0);

  const broken = clone(sample.team);
  broken.awardSplits[0].percent = 60;
  const brokenCheck = validateAwardSplits(broken);
  assert(brokenCheck.actions.some((item) => item.code === "award_split_total_invalid"));
}

function testPacketBlocksUntilPayoutEvidenceIsReady() {
  const packet = buildPayoutReadinessPacket(sample);
  assert.equal(packet.status, "blocked");
  assert.equal(packet.ipRelease, "blocked-until-ready");
  assert(packet.auditDigest.length === 64);
  assert(packet.payoutPlan.some((entry) => entry.contributorId === "solver-2" && entry.amountUsd === 300));
  assert(packet.remediationActions[0].severity === "blocker");

  const sponsorSummary = summarizeForSponsor(packet);
  assert.equal(sponsorSummary.settlementRecommendation, "block_until_remediated");
  assert(sponsorSummary.nextActions.some((item) => item.code === "payout_method_required"));
}

function testReadyPacketReleasesOnlyWhenFunded() {
  const ready = clone(sample);
  ready.team.contributors[1].payoutMethodVerified = true;
  ready.team.contributors[1].taxFormStatus = "valid";
  ready.team.contributors[1].institutionRouting.approved = true;
  const readyPacket = buildPayoutReadinessPacket(ready);

  assert.equal(readyPacket.status, "ready");
  assert.equal(readyPacket.ipRelease, "release-after-payout");

  ready.challenge.settlementFunded = false;
  const unfundedPacket = buildPayoutReadinessPacket(ready);
  assert.equal(unfundedPacket.status, "blocked");
  assert(unfundedPacket.remediationActions.some((item) => item.code === "settlement_not_funded"));
}

function testStableDigest() {
  assert.equal(normalizeCountry(" us "), "US");
  assert.equal(stableJson({ b: 2, a: 1 }), stableJson({ a: 1, b: 2 }));
  assert.equal(auditDigest({ b: 2, a: 1 }), auditDigest({ a: 1, b: 2 }));
}

testContributorReadiness();
testAwardSplitValidation();
testPacketBlocksUntilPayoutEvidenceIsReady();
testReadyPacketReleasesOnlyWhenFunded();
testStableDigest();

console.log("bounty-payout-eligibility-gate tests passed");
