"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  digest,
  evaluateEscrowBook,
  evaluateRoutes,
  signLedgerEvent,
  stableStringify
} = require("../src/escrow-settlement-ledger");

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "sample-escrow-book.json"), "utf8"));

test("summarizes ready, held, and blocked bounty settlements", () => {
  const result = evaluateEscrowBook(sample);

  assert.equal(result.summary.totalChallenges, 3);
  assert.equal(result.summary.ready, 1);
  assert.equal(result.summary.held, 1);
  assert.equal(result.summary.blocked, 1);
  assert.equal(result.summary.payableNow, 30000);
  assert.equal(result.summary.heldAmount, 2500);
  assert.equal(result.summary.shortfall, 3000);
  assert.equal(result.summary.settlementPacketCount, 2);
});

test("builds payout packets and IP release state for a funded challenge", () => {
  const result = evaluateEscrowBook(sample);
  const challenge = result.challenges.find((candidate) => candidate.challengeId === "challenge-biomarker-rna");

  assert.equal(challenge.settlementDecision, "ready");
  assert.equal(challenge.ipReleaseState, "transfer_after_settlement");
  assert.equal(challenge.settlementPackets.length, 2);
  assert.equal(challenge.settlementPackets[0].routeTotal, 10000);
  assert.deepEqual(
    challenge.settlementPackets[0].routes.map((route) => route.amount),
    [1000, 4500, 4500]
  );
  assert.equal(challenge.settlementPackets[0].packetDigest.length, 64);
});

test("blocks underfunded sponsor escrow before grand prize settlement", () => {
  const result = evaluateEscrowBook(sample);
  const challenge = result.challenges.find((candidate) => candidate.challengeId === "challenge-regional-forecast");

  assert.equal(challenge.settlementDecision, "blocked");
  assert.equal(challenge.shortfall, 3000);
  assert.equal(challenge.payableNow, 0);
  assert.equal(challenge.ipReleaseState, "locked_pending_funding_or_routes");
  assert.match(challenge.obligations[0].title, /underfunded by 3000/);
});

test("holds payout and IP release while appeals are open", () => {
  const result = evaluateEscrowBook(sample);
  const challenge = result.challenges.find((candidate) => candidate.challengeId === "challenge-quantum-noise");

  assert.equal(challenge.settlementDecision, "held");
  assert.equal(challenge.heldAmount, 2500);
  assert.equal(challenge.ipReleaseState, "locked_pending_hold_resolution");
  assert.equal(challenge.obligationCounts.hold, 1);
  assert.equal(challenge.settlementPackets.length, 0);
});

test("validates route basis points and deterministic event signatures", () => {
  const routeCheck = evaluateRoutes(
    {
      payoutRoutes: [
        { routeId: "one", payee: "One", routeType: "individual", shareBps: 7000, profileStatus: "complete" },
        { routeId: "two", payee: "Two", routeType: "individual", shareBps: 3000, profileStatus: "complete" }
      ]
    },
    1234
  );

  assert.equal(routeCheck.valid, true);
  assert.deepEqual(
    routeCheck.routes.map((route) => route.amount),
    [863.8, 370.2]
  );

  const event = {
    type: "scientific_bounty.escrow.evaluated",
    challengeId: "challenge-biomarker-rna",
    payableNow: 30000
  };
  const first = signLedgerEvent(event, "test-secret");
  const second = signLedgerEvent({ payableNow: 30000, challengeId: "challenge-biomarker-rna", type: "scientific_bounty.escrow.evaluated" }, "test-secret");

  assert.equal(first.digest, second.digest);
  assert.equal(first.signature, second.signature);
  assert.equal(first.digest.length, 64);
  assert.equal(digest(event).length, 64);
  assert.equal(stableStringify({ b: 2, a: 1 }), "{\"a\":1,\"b\":2}");
});
