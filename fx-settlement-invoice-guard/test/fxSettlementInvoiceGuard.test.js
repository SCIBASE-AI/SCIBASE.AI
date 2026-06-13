"use strict";

const assert = require("node:assert/strict");
const packets = require("../examples/fx-settlement-packets.json");
const {
  RELEASE,
  REVIEW,
  HOLD,
  evaluateFxSettlementPacket,
  evaluateFxSettlementBatch,
  summarize,
  roundCurrency
} = require("../src");

assert.equal(roundCurrency(12.345, "USD"), 12.35);
assert.equal(roundCurrency(123.6, "JPY"), 124);

const results = evaluateFxSettlementBatch(packets, { asOf: "2026-06-14T12:00:00Z" });

assert.equal(results[0].decision, RELEASE);
assert.equal(results[0].expectedSettlement, 2808);
assert.deepEqual(results[0].findings.map((finding) => finding.code), ["fx_settlement_ready"]);

assert.equal(results[1].decision, REVIEW);
assert(results[1].findings.some((finding) => finding.code === "fx_snapshot_stale"));
assert(results[1].findings.some((finding) => finding.code === "fx_quote_before_invoice_window"));
assert(results[1].findings.some((finding) => finding.code === "fx_settlement_variance"));

assert.equal(results[2].decision, HOLD);
assert(results[2].findings.some((finding) => finding.code === "minor_unit_rounding_invalid"));
assert(results[2].findings.some((finding) => finding.code === "processor_reference_missing"));
assert(results[2].findings.some((finding) => finding.code === "material_fx_settlement_variance"));
assert(results[2].findings.some((finding) => finding.code === "credit_offset_approval_missing"));

const unsupported = evaluateFxSettlementPacket({
  invoiceId: "inv:unsupported",
  accountId: "acct:test",
  invoiceCurrency: "BTC",
  settlementCurrency: "USD",
  accountCurrency: "BTC",
  invoiceIssuedAt: "2026-06-13T00:00:00Z",
  releaseAt: "2026-06-13T01:00:00Z",
  lineItems: [{ description: "Unsupported currency invoice", amount: 1 }],
  fxSnapshot: {
    source: "test",
    rateId: "fx:test",
    rate: 100,
    quotedAt: "2026-06-13T00:30:00Z"
  },
  processorReference: "processor:test",
  processorSettlementAmount: 100
});

assert.equal(unsupported.decision, HOLD);
assert(unsupported.findings.some((finding) => finding.code === "invoiceCurrency_unsupported"));
assert(unsupported.findings.some((finding) => finding.code === "accountCurrency_unsupported"));

const summary = summarize(results);
assert.equal(summary.blocks, 4);
assert.equal(summary.reviews, 5);
assert.equal(summary.passes, 1);

console.log("fx settlement invoice guard tests passed");
