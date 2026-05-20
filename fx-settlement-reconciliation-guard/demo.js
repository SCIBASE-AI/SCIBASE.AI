"use strict";

const { evaluateFxSettlements, money } = require("./index");

const sample = {
  rateBooks: [
    { currency: "EUR", date: "2026-05-20", rateToBase: 1.09, sources: 3 },
    { currency: "GBP", date: "2026-05-20", rateToBase: 1.27, sources: 2 },
    { currency: "KRW", date: "2026-05-20", rateToBase: 0.00073, sources: 1 },
  ],
  settlements: [
    {
      id: "settle-eu-policy",
      invoiceId: "INV-EU-101",
      customerId: "eu-policy-lab",
      providerReference: "stripe-fx-101",
      invoiceCurrency: "EUR",
      invoiceAmountCents: 125000,
      invoiceDate: "2026-05-20",
      settlementDate: "2026-05-22",
      customerCountry: "DE",
      sellerCountry: "US",
      taxEvidenceId: "VAT-RC-101",
      providerFeeBaseCents: 1900,
      remittedBaseCents: 134350,
      bookedBaseCents: 134350,
    },
    {
      id: "settle-uk-consortium",
      invoiceId: "INV-UK-102",
      customerId: "uk-consortium",
      providerReference: "wise-fx-102",
      invoiceCurrency: "GBP",
      invoiceAmountCents: 78000,
      invoiceDate: "2026-05-20",
      settlementDate: "2026-05-30",
      customerCountry: "GB",
      sellerCountry: "US",
      taxEvidenceId: "VAT-RC-102",
      providerFeeBaseCents: 2400,
      remittedBaseCents: 95500,
      bookedBaseCents: 97200,
    },
    {
      id: "settle-kr-dashboard",
      invoiceId: "INV-KR-103",
      customerId: "kr-dashboard-pilot",
      providerReference: "bank-fx-103",
      invoiceCurrency: "KRW",
      invoiceAmountCents: 92000000,
      invoiceDate: "2026-05-20",
      settlementDate: "2026-05-24",
      customerCountry: "KR",
      sellerCountry: "US",
      providerFeeBaseCents: 850,
      remittedBaseCents: 66100,
      bookedBaseCents: 66300,
    },
  ],
};

const report = evaluateFxSettlements(sample);

console.log("FX Settlement Reconciliation Guard Demo");
console.log("=======================================");
console.log(`settlements: ${report.settlementCount}`);
console.log(`ready: ${report.totals.readyCount}, held: ${report.totals.heldCount}, blocked: ${report.totals.blockedCount}`);
console.log(`expected base: ${money(report.totals.expectedBaseCents)}`);
console.log(`remitted base: ${money(report.totals.remittedBaseCents)}`);
console.log(`provider fees: ${money(report.totals.providerFeeBaseCents)}`);
console.log(`FX variance: ${money(report.totals.fxVarianceCents)}`);
console.log(`audit digest: ${report.auditDigest.slice(0, 16)}...`);

for (const evaluation of report.evaluations) {
  console.log("");
  console.log(`${evaluation.settlementId} ${evaluation.status.toUpperCase()} ${evaluation.invoiceCurrency} ${money(evaluation.invoiceAmountCents)}`);
  console.log(`  expected ${money(evaluation.expectedBaseCents)} remitted ${money(evaluation.remittedBaseCents)} variance ${money(evaluation.fxVarianceCents)}`);
  for (const finding of evaluation.findings) {
    console.log(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  }
  for (const action of evaluation.recommendedActions) {
    console.log(`  action: ${action}`);
  }
}
