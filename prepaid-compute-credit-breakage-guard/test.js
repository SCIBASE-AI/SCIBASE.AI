const assert = require("node:assert/strict");
const {
  analyzeCreditBreakage,
  createAuditDigest,
} = require("./index");
const { sampleCreditLots } = require("./sample-data");

const AS_OF = "2026-05-22T12:00:00.000Z";

function byId(result, id) {
  const lot = result.lots.find((entry) => entry.id === id);
  assert.ok(lot, `expected lot ${id} to exist`);
  return lot;
}

function run() {
  const result = analyzeCreditBreakage(sampleCreditLots, {
    asOf: AS_OF,
    expiringSoonDays: 30,
  });

  assert.equal(result.asOf, AS_OF);
  assert.equal(result.totals.openBalanceCents, 790000);
  assert.equal(result.totals.usableBalanceCents, 80000);
  assert.equal(result.totals.breakageEligibleCents, 125000);
  assert.equal(result.totals.noticeDueCents, 180000);
  assert.equal(result.totals.refundLiabilityCents, 50000);
  assert.equal(result.totals.financeHoldCents, 245000);
  assert.equal(result.totals.protectedBalanceCents, 110000);

  const eligible = byId(result, "lot-expired-eligible");
  assert.equal(eligible.status, "breakage_ready");
  assert.equal(eligible.recognizableBreakageCents, 125000);
  assert.deepEqual(eligible.actions, [
    "Recognize breakage after finance approval",
    "Attach customer notice and terms evidence",
    "Record audit digest in revenue close packet",
  ]);

  const noNotice = byId(result, "lot-expired-no-notice");
  assert.equal(noNotice.status, "finance_hold");
  assert.equal(noNotice.recognizableBreakageCents, 0);
  assert.ok(noNotice.reasons.includes("customer notice evidence is missing"));

  const refund = byId(result, "lot-refund-window-open");
  assert.equal(refund.status, "refund_liability");
  assert.equal(refund.refundLiabilityCents, 50000);
  assert.equal(refund.recognizableBreakageCents, 0);

  const expiring = byId(result, "lot-expiring-soon");
  assert.equal(expiring.status, "notice_due");
  assert.equal(expiring.daysUntilExpiry, 11);
  assert.deepEqual(expiring.actions, [
    "Send expiration notice before recognizing any breakage",
    "Keep credits usable through the expiration deadline",
  ]);

  const grant = byId(result, "lot-grant-no-expiry");
  assert.equal(grant.status, "protected");
  assert.equal(grant.protectedBalanceCents, 110000);
  assert.ok(grant.reasons.includes("grant or contract terms prohibit expiration"));

  const future = byId(result, "lot-active-future");
  assert.equal(future.status, "usable");
  assert.equal(future.recognizableBreakageCents, 0);

  const digest = createAuditDigest(result);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.equal(digest, createAuditDigest(result));

  assert.throws(
    () => analyzeCreditBreakage([{ id: "bad", originalCents: 1 }], { asOf: AS_OF }),
    /missing required credit lot field/
  );
}

run();
console.log("prepaid compute credit breakage guard tests passed");
