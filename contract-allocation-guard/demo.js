"use strict";

const { evaluateContractAllocations } = require("./index");

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const report = evaluateContractAllocations({
  contracts: [
    {
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
    },
    {
      id: "ENT-2026-HOLD",
      customerId: "grant-consortium-beta",
      currency: "USD",
      contractTotalCents: 10000000,
      obligations: [
        {
          id: "subscription-platform",
          type: "subscription",
          quantity: 12,
          unitSspCents: 1000000,
          sspEvidenceScore: 0.56,
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
    },
    {
      id: "ENT-2026-BLOCK",
      customerId: "lab-network-gamma",
      currency: "USD",
      contractTotalCents: 2500000,
      obligations: [
        {
          id: "subscription-platform",
          type: "subscription",
          quantity: 6,
          unitSspCents: 0,
          sspEvidenceScore: 0.9,
        },
      ],
    },
  ],
});

console.log("Contract Allocation Guard Demo");
console.log("================================");
console.log(`contracts: ${report.contractCount}`);
console.log(`ready: ${report.totals.readyCount}, held: ${report.totals.heldCount}, blocked: ${report.totals.blockedCount}`);
console.log(`allocated revenue: ${money(report.totals.allocatedRevenueCents)}`);
console.log(`earned through ${report.asOf}: ${money(report.totals.earnedRevenueCents)}`);
console.log(`deferred revenue: ${money(report.totals.deferredRevenueCents)}`);
console.log(`audit digest: ${report.auditDigest.slice(0, 16)}...`);

for (const evaluation of report.evaluations) {
  console.log(`- ${evaluation.contractId}: ${evaluation.status}, ${evaluation.obligationCount} obligations`);
}
