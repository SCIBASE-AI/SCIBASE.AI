"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const challenges = require("./data/challenges.json");
const { buildPayoutLedger, buildPayoutLedgers, summarizeLedgers } = require("./ledger");

test("allocates accepted milestone funds across verified team members", () => {
  const ledger = buildPayoutLedger(challenges[0]);

  assert.equal(ledger.unlockedAmountCents, 80000);
  assert.equal(ledger.lockedAmountCents, 40000);
  assert.equal(ledger.payable, true);
  assert.deepEqual(
    ledger.allocations.map((allocation) => allocation.grossCents),
    [44000, 24000, 12000],
  );
  assert.equal(ledger.findings.length, 1);
  assert.equal(ledger.findings[0].code, "milestone_locked");
});

test("blocks release when route verification and split totals are invalid", () => {
  const ledger = buildPayoutLedger(challenges[1]);
  const codes = ledger.findings.map((item) => item.code);

  assert.equal(ledger.payable, false);
  assert.ok(codes.includes("payout_route_unverified"));
  assert.ok(codes.includes("split_total_mismatch"));
  assert.ok(codes.includes("institution_overhead_exceeds_cap"));
});

test("holds allocations when institution overhead leaves too little direct solver share", () => {
  const ledger = buildPayoutLedger(challenges[2]);
  const solverShareFinding = ledger.findings.find((item) => item.code === "solver_share_below_minimum");

  assert.equal(ledger.payable, false);
  assert.equal(solverShareFinding.severity, "hold");
  assert.equal(solverShareFinding.target, "solver-zeta");
});

test("summarizes payout readiness across challenge ledgers", () => {
  const ledgers = buildPayoutLedgers(challenges);
  const summary = summarizeLedgers(ledgers);

  assert.deepEqual(summary, {
    total: 3,
    payable: 1,
    blocked: 2,
    held: 2,
    unlockedCents: 230000,
    lockedCents: 40000,
  });
});
