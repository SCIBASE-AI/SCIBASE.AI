"use strict";

const assert = require("assert/strict");
const { evaluateSettlement } = require("./index");

function baseAgreement(overrides = {}) {
  return {
    id: "agreement-a",
    datasetId: "dataset-a",
    status: "active",
    endsAt: "2026-12-31",
    platformFeeRate: 0.18,
    resellerFeeRate: 0.08,
    allowedUseCases: ["policy-planning"],
    contributorRoyaltySplits: [
      { contributorId: "lab-a", share: 0.6 },
      { contributorId: "lab-b", share: 0.4 },
    ],
    ...overrides,
  };
}

function baseEvent(overrides = {}) {
  return {
    id: "event-a",
    invoiceId: "INV-A",
    agreementId: "agreement-a",
    customerId: "customer-a",
    datasetId: "dataset-a",
    useCase: "policy-planning",
    grossCents: 100000,
    subjectCount: 80,
    consentAttestation: true,
    ...overrides,
  };
}

{
  const report = evaluateSettlement({
    agreements: [baseAgreement()],
    licenseEvents: [baseEvent()],
  });

  assert.equal(report.settlements[0].status, "ready");
  assert.equal(report.totals.readyCount, 1);
  assert.equal(report.totals.readyPayoutCents, 74000);
  assert.equal(report.settlements[0].payoutLines[0].payableCents, 44400);
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
}

{
  const first = evaluateSettlement({
    agreements: [baseAgreement()],
    licenseEvents: [baseEvent()],
  });
  const second = evaluateSettlement({
    agreements: [baseAgreement()],
    licenseEvents: [baseEvent()],
  });
  assert.equal(first.auditDigest, second.auditDigest);
}

{
  const report = evaluateSettlement({
    agreements: [baseAgreement()],
    licenseEvents: [baseEvent({ subjectCount: 8 })],
  });

  assert.equal(report.settlements[0].status, "held");
  assert.equal(report.totals.heldCount, 1);
  assert.equal(report.settlements[0].reserveCents, 3700);
  assert.ok(report.settlements[0].findings.some((finding) => finding.code === "aggregation_floor"));
}

{
  const report = evaluateSettlement({
    agreements: [baseAgreement({ contributorRoyaltySplits: [{ contributorId: "lab-a", share: 0.7 }] })],
    licenseEvents: [baseEvent()],
  });

  assert.equal(report.settlements[0].status, "blocked");
  assert.ok(report.settlements[0].findings.some((finding) => finding.code === "split_mismatch"));
}

{
  const report = evaluateSettlement({
    agreements: [baseAgreement()],
    licenseEvents: [
      baseEvent({ id: "event-a", invoiceId: "INV-DUP" }),
      baseEvent({ id: "event-b", invoiceId: "INV-DUP", grossCents: 22000 }),
    ],
  });

  assert.equal(report.settlements[0].status, "ready");
  assert.equal(report.settlements[1].status, "blocked");
  assert.ok(report.settlements[1].findings.some((finding) => finding.code === "duplicate_invoice"));
}

{
  assert.throws(
    () =>
      evaluateSettlement({
        agreements: [baseAgreement()],
        licenseEvents: [baseEvent({ grossCents: 10.5 })],
      }),
    /grossCents must be a non-negative integer/
  );
}

console.log("partner-royalty-settlement-guard tests passed");
