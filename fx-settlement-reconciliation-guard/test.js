"use strict";

const assert = require("assert/strict");
const { evaluateFxSettlements } = require("./index");

function baseRate(overrides = {}) {
  return {
    currency: "EUR",
    date: "2026-05-20",
    rateToBase: 1.09,
    sources: 3,
    ...overrides,
  };
}

function baseSettlement(overrides = {}) {
  return {
    id: "fx-ready",
    invoiceId: "INV-EU-001",
    customerId: "eu-research-network",
    providerReference: "stripe-remit-001",
    invoiceCurrency: "EUR",
    invoiceAmountCents: 100000,
    invoiceDate: "2026-05-20",
    settlementDate: "2026-05-22",
    customerCountry: "DE",
    sellerCountry: "US",
    taxEvidenceId: "VAT-RC-001",
    providerFeeBaseCents: 1600,
    remittedBaseCents: 107400,
    bookedBaseCents: 107400,
    ...overrides,
  };
}

{
  const report = evaluateFxSettlements({
    rateBooks: [baseRate()],
    settlements: [baseSettlement()],
  });

  assert.equal(report.settlementCount, 1);
  assert.equal(report.evaluations[0].status, "ready");
  assert.equal(report.totals.readyCount, 1);
  assert.equal(report.evaluations[0].expectedBaseCents, 109000);
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
}

{
  const first = evaluateFxSettlements({
    rateBooks: [baseRate()],
    settlements: [baseSettlement()],
  });
  const second = evaluateFxSettlements({
    rateBooks: [baseRate()],
    settlements: [baseSettlement()],
  });
  assert.equal(first.auditDigest, second.auditDigest);
}

{
  const report = evaluateFxSettlements({
    rateBooks: [],
    settlements: [baseSettlement()],
  });

  assert.equal(report.evaluations[0].status, "blocked");
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "missing_fx_rate"));
}

{
  const report = evaluateFxSettlements({
    rateBooks: [baseRate({ sources: 1 })],
    settlements: [baseSettlement()],
  });

  assert.equal(report.evaluations[0].status, "held");
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "weak_rate_source"));
}

{
  const report = evaluateFxSettlements({
    rateBooks: [baseRate()],
    settlements: [
      baseSettlement({
        id: "fx-variance",
        remittedBaseCents: 99000,
        bookedBaseCents: 107400,
      }),
    ],
  });

  assert.equal(report.evaluations[0].status, "held");
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "fx_variance"));
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "booking_reconciliation"));
}

{
  const report = evaluateFxSettlements({
    rateBooks: [baseRate()],
    settlements: [
      baseSettlement({ id: "fx-a", providerReference: "paypal-ref-dup" }),
      baseSettlement({ id: "fx-b", providerReference: "paypal-ref-dup", invoiceId: "INV-EU-002" }),
    ],
  });

  assert.equal(report.evaluations[0].status, "ready");
  assert.equal(report.evaluations[1].status, "blocked");
  assert.ok(report.evaluations[1].findings.some((finding) => finding.code === "duplicate_provider_reference"));
}

{
  const report = evaluateFxSettlements({
    rateBooks: [baseRate()],
    settlements: [
      baseSettlement({
        id: "fx-late",
        settlementDate: "2026-06-03",
        providerFeeBaseCents: 2500,
        taxEvidenceId: undefined,
      }),
    ],
  });

  assert.equal(report.evaluations[0].status, "held");
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "settlement_lag"));
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "provider_fee_cap"));
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "missing_cross_border_tax_evidence"));
}

{
  assert.throws(
    () =>
      evaluateFxSettlements({
        rateBooks: [baseRate()],
        settlements: [baseSettlement({ invoiceAmountCents: 100.5 })],
      }),
    /invoiceAmountCents must be a non-negative integer/
  );
}

console.log("fx-settlement-reconciliation-guard tests passed");
