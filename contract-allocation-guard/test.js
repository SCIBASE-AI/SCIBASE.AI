"use strict";

const assert = require("assert/strict");
const { evaluateContractAllocations } = require("./index");

function baseContract(overrides = {}) {
  return {
    id: "ENT-2026-001",
    customerId: "national-research-cloud",
    currency: "USD",
    contractTotalCents: 18000000,
    obligations: [
      {
        id: "subscription-platform",
        type: "subscription",
        quantity: 12,
        unitSspCents: 900000,
        sspEvidenceScore: 0.92,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      },
      {
        id: "compute-credits",
        type: "ai_compute",
        quantity: 1,
        unitSspCents: 6000000,
        sspEvidenceScore: 0.87,
        estimatedUsageUnits: 100000,
        usageToDateUnits: 42000,
      },
      {
        id: "analytics-license",
        type: "analytics_license",
        quantity: 1,
        unitSspCents: 4500000,
        sspEvidenceScore: 0.89,
        deliveryEvidenceId: "DELIVERY-ANON-GRAPH-001",
      },
    ],
    ...overrides,
  };
}

{
  const report = evaluateContractAllocations({ contracts: [baseContract()] });
  const evaluation = report.evaluations[0];

  assert.equal(report.contractCount, 1);
  assert.equal(evaluation.status, "ready");
  assert.equal(evaluation.totals.allocatedRevenueCents, 18000000);
  assert.ok(evaluation.totals.earnedRevenueCents > 0);
  assert.ok(evaluation.totals.deferredRevenueCents > 0);
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
}

{
  const first = evaluateContractAllocations({ contracts: [baseContract()] });
  const second = evaluateContractAllocations({ contracts: [baseContract()] });

  assert.equal(first.auditDigest, second.auditDigest);
}

{
  const report = evaluateContractAllocations({
    contracts: [
      baseContract({
        id: "ENT-ROUNDING",
        contractTotalCents: 1000001,
        obligations: [
          {
            id: "sub",
            type: "subscription",
            quantity: 1,
            unitSspCents: 1000000,
            sspEvidenceScore: 0.9,
            startDate: "2026-01-01",
            endDate: "2026-12-31",
          },
          {
            id: "compute",
            type: "ai_compute",
            quantity: 1,
            unitSspCents: 1000000,
            sspEvidenceScore: 0.9,
            estimatedUsageUnits: 100,
            usageToDateUnits: 10,
          },
          {
            id: "license",
            type: "analytics_license",
            quantity: 1,
            unitSspCents: 1000000,
            sspEvidenceScore: 0.9,
            deliveryEvidenceId: "DELIVERY-1",
          },
        ],
      }),
    ],
  });

  assert.equal(report.evaluations[0].totals.allocatedRevenueCents, 1000001);
}

{
  const report = evaluateContractAllocations({
    contracts: [
      baseContract({
        obligations: [
          {
            id: "subscription-platform",
            type: "subscription",
            quantity: 12,
            unitSspCents: 0,
            sspEvidenceScore: 0.95,
            startDate: "2026-01-01",
            endDate: "2026-12-31",
          },
        ],
      }),
    ],
  });

  assert.equal(report.evaluations[0].status, "blocked");
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "missing_obligation_ssp"));
}

{
  const report = evaluateContractAllocations({
    contracts: [
      baseContract({
        contractTotalCents: 10000000,
        obligations: [
          {
            id: "subscription-platform",
            type: "subscription",
            quantity: 12,
            unitSspCents: 1000000,
            sspEvidenceScore: 0.55,
            startDate: "2026-01-01",
            endDate: "2026-12-31",
          },
          {
            id: "analytics-license",
            type: "analytics_license",
            quantity: 1,
            unitSspCents: 5000000,
            sspEvidenceScore: 0.7,
          },
        ],
      }),
    ],
  });

  assert.equal(report.evaluations[0].status, "held");
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "weak_ssp_evidence"));
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "bundle_discount_cap"));
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "missing_delivery_evidence"));
}

{
  const report = evaluateContractAllocations({
    contracts: [
      baseContract({
        obligations: [
          {
            id: "subscription-platform",
            type: "subscription",
            quantity: 12,
            unitSspCents: 900000,
            sspEvidenceScore: 0.92,
          },
        ],
      }),
    ],
  });

  assert.equal(report.evaluations[0].status, "blocked");
  assert.ok(report.evaluations[0].findings.some((finding) => finding.code === "missing_ratable_dates"));
}

{
  assert.throws(
    () =>
      evaluateContractAllocations({
        contracts: [baseContract({ contractTotalCents: 100.5 })],
      }),
    /contractTotalCents must be a non-negative integer/
  );
}

console.log("contract-allocation-guard tests passed");
