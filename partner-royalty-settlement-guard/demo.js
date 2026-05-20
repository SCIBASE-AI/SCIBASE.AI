"use strict";

const { evaluateSettlement, money } = require("./index");

const sampleBatch = {
  agreements: [
    {
      id: "agr-national-knowledge-graph",
      datasetId: "dataset-citation-network-2026q2",
      status: "active",
      endsAt: "2027-03-31",
      platformFeeRate: 0.18,
      resellerFeeRate: 0.08,
      allowedUseCases: ["policy-planning", "meta-research"],
      contributorRoyaltySplits: [
        { contributorId: "lab-north", share: 0.45 },
        { contributorId: "lab-south", share: 0.35 },
        { contributorId: "data-trust", share: 0.2 },
      ],
    },
    {
      id: "agr-white-label-pilot",
      datasetId: "dataset-method-trends",
      status: "active",
      endsAt: "2026-09-30",
      platformFeeRate: 0.2,
      resellerFeeRate: 0.12,
      allowedUseCases: ["white-label-dashboard"],
      contributorRoyaltySplits: [
        { contributorId: "methods-lab", share: 0.5 },
        { contributorId: "instrument-core", share: 0.5 },
      ],
    },
    {
      id: "agr-expired-consortium",
      datasetId: "dataset-private-notes",
      status: "active",
      endsAt: "2026-01-31",
      allowedUseCases: ["market-intelligence"],
      contributorRoyaltySplits: [{ contributorId: "legacy-lab", share: 1 }],
    },
  ],
  licenseEvents: [
    {
      id: "lic-001",
      invoiceId: "INV-2026-05-101",
      agreementId: "agr-national-knowledge-graph",
      customerId: "nih-policy-office",
      datasetId: "dataset-citation-network-2026q2",
      useCase: "policy-planning",
      grossCents: 125000,
      subjectCount: 480,
      consentAttestation: true,
    },
    {
      id: "lic-002",
      invoiceId: "INV-2026-05-102",
      agreementId: "agr-white-label-pilot",
      customerId: "research-dashboard-reseller",
      datasetId: "dataset-method-trends",
      useCase: "white-label-dashboard",
      grossCents: 36000,
      subjectCount: 18,
      consentAttestation: true,
    },
    {
      id: "lic-003",
      invoiceId: "INV-2026-05-101",
      agreementId: "agr-expired-consortium",
      customerId: "market-intel-firm",
      datasetId: "dataset-private-notes",
      useCase: "market-intelligence",
      grossCents: 64000,
      subjectCount: 72,
      consentAttestation: false,
    },
  ],
};

const report = evaluateSettlement(sampleBatch);

console.log("Partner Royalty Settlement Guard Demo");
console.log("=====================================");
console.log(`settlements: ${report.settlementCount}`);
console.log(`ready: ${report.totals.readyCount}, held: ${report.totals.heldCount}, blocked: ${report.totals.blockedCount}`);
console.log(`ready payouts: ${money(report.totals.readyPayoutCents)}`);
console.log(`held payouts: ${money(report.totals.heldPayoutCents)}`);
console.log(`blocked gross: ${money(report.totals.blockedGrossCents)}`);
console.log(`audit digest: ${report.auditDigest.slice(0, 16)}...`);

for (const settlement of report.settlements) {
  console.log("");
  console.log(`${settlement.eventId} ${settlement.status.toUpperCase()} ${money(settlement.grossCents)} ${settlement.invoiceId}`);
  for (const finding of settlement.findings) {
    console.log(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  }
  for (const action of settlement.recommendedActions) {
    console.log(`  action: ${action}`);
  }
}
