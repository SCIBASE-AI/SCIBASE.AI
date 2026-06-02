const assert = require("node:assert/strict");
const { cleanPacket, riskyPacket } = require("./sample-data");
const {
  evaluateSponsorEscrowPacket,
  payoutScheduleTotal,
  summarizeDecision
} = require("./index");

const clean = evaluateSponsorEscrowPacket(cleanPacket);
assert.equal(clean.decision, "release");
assert.equal(clean.releaseCount, 1);
assert.equal(clean.holdCount, 0);
assert.equal(clean.blockerCount, 0);

const risky = evaluateSponsorEscrowPacket(riskyPacket);
assert.equal(risky.decision, "hold");
assert.equal(risky.checkedChallenges, 2);
assert.equal(risky.holdCount, 2);
assert.equal(risky.blockerCount, 7);
assert.equal(risky.revisionCount, 2);

const riskyCodes = risky.challengeResults.flatMap((item) => item.findings.map((finding) => finding.code));
assert.ok(riskyCodes.includes("ESCROW_EVIDENCE_MISSING"));
assert.ok(riskyCodes.includes("ESCROW_UNDERFUNDED"));
assert.ok(riskyCodes.includes("SPONSOR_RELEASE_AUTH_MISSING"));
assert.ok(riskyCodes.includes("ESCROW_EXPIRES_BEFORE_AWARD"));
assert.ok(riskyCodes.includes("ESCROW_EVIDENCE_STALE"));
assert.ok(riskyCodes.includes("PAYOUT_TOTAL_MISMATCH"));
assert.ok(riskyCodes.includes("PAYOUT_ROUTE_INCOMPLETE"));
assert.ok(riskyCodes.includes("UNSUPPORTED_CURRENCY"));
assert.ok(riskyCodes.includes("PAYOUT_SCHEDULE_MISSING"));

assert.equal(payoutScheduleTotal(cleanPacket.challenges[0].payoutSchedule), 150000);
assert.equal(summarizeDecision([{ severity: "revise" }]), "revise");
assert.equal(summarizeDecision([{ severity: "block" }, { severity: "revise" }]), "hold");
assert.throws(() => evaluateSponsorEscrowPacket({ generatedAt: "not-a-date", challenges: [] }));
assert.throws(() => evaluateSponsorEscrowPacket({ generatedAt: "2026-06-02" }));

console.log("sponsor escrow readiness guard tests passed");
