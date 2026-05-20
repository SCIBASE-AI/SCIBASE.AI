"use strict";

const assert = require("assert");
const {
  evaluatePaymentRailFailoverReadiness,
  auditDigest,
  supportsInvoice,
} = require("./index");
const sample = require("./sample-data");

function decisionFor(report, invoiceId) {
  return report.decisions.find((decision) => decision.invoiceId === invoiceId);
}

function run() {
  const report = evaluatePaymentRailFailoverReadiness(sample);

  assert.strictEqual(report.summary.total, sample.invoices.length);
  assert.strictEqual(report.summary.byDecision.release_with_fallback, 1);
  assert.strictEqual(report.summary.byDecision.hold_for_review, 1);
  assert.strictEqual(report.summary.byDecision.release, 1);
  assert.strictEqual(report.summary.byDecision.block, 3);

  const labSubscription = decisionFor(report, "inv-alpha-subscription-001");
  assert.strictEqual(labSubscription.decision, "release_with_fallback");
  assert.strictEqual(labSubscription.selectedRail, "institutional_invoice");
  assert.strictEqual(labSubscription.fallbackUsed, true);

  const euTopUp = decisionFor(report, "inv-eu-compute-topup-002");
  assert.strictEqual(euTopUp.decision, "hold_for_review");
  assert(
    euTopUp.findings.some(
      (finding) => finding.code === "missing_fallback_finance_approval"
    )
  );
  assert(
    euTopUp.findings.some((finding) => finding.code === "missing_customer_notice")
  );

  const governmentLicense = decisionFor(report, "inv-gov-license-003");
  assert.strictEqual(governmentLicense.decision, "release");
  assert.strictEqual(governmentLicense.selectedRail, "institutional_invoice");

  const soloTopUp = decisionFor(report, "inv-solo-topup-004");
  assert.strictEqual(soloTopUp.decision, "block");
  assert(
    soloTopUp.findings.some(
      (finding) => finding.code === "no_compatible_fallback_rail"
    )
  );

  const duplicate = decisionFor(report, "inv-duplicate-a");
  assert.strictEqual(duplicate.decision, "block");
  assert(
    duplicate.findings.some(
      (finding) => finding.code === "duplicate_idempotency_key"
    )
  );

  const institutionalRail = sample.rails.find(
    (rail) => rail.id === "institutional_invoice"
  );
  const labAccount = sample.accounts.find((account) => account.id === "lab-alpha");
  const labInvoice = sample.invoices.find(
    (invoice) => invoice.id === "inv-alpha-subscription-001"
  );
  assert.strictEqual(
    supportsInvoice(institutionalRail, labAccount, labInvoice).ok,
    true
  );

  const firstDigest = auditDigest(report);
  const secondDigest = auditDigest(JSON.parse(JSON.stringify(report)));
  assert.strictEqual(firstDigest, secondDigest);
  assert.strictEqual(report.auditDigest.length, 20);

  console.log("payment-rail-failover-guard tests passed");
}

run();
