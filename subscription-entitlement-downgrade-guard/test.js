"use strict";

const assert = require("assert");
const { createDowngradeReviewPacket, daysUntil, evaluateDowngrade } = require("./index");
const { downgradePacket } = require("./sample-data");

function runTests() {
  assert.strictEqual(daysUntil("2026-05-22T00:00:00Z", "2026-05-20T00:00:00Z"), 2);

  const evaluation = evaluateDowngrade(downgradePacket);
  assert.strictEqual(evaluation.status, "held-for-finance-review");
  assert(evaluation.holds.includes("seat-limit-exceeded"), "seat overage should hold downgrade");
  assert(evaluation.holds.includes("storage-limit-exceeded"), "storage overage should hold downgrade");
  assert(evaluation.holds.includes("locked-feature-migration-required"), "locked features should require migration");
  assert(evaluation.holds.includes("past-due-invoice-review-required"), "past due invoice should require finance review");
  assert(evaluation.metrics.commitmentDaysRemaining > downgradePacket.downgradePolicy.allowGraceDays);

  const packet = createDowngradeReviewPacket(downgradePacket);
  assert.strictEqual(packet.policyReceipt.financeReviewForPastDue, true);
  assert(packet.remediation.some((item) => item.includes("unpaid invoices")), "remediation should mention invoices");
}

if (require.main === module) {
  runTests();
  console.log("subscription entitlement downgrade tests passed");
}

module.exports = { runTests };
