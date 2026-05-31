const assert = require("assert");
const { evaluateCancellationPacket } = require("./cancellationGuard");
const samplePacket = require("./samplePacket");

const result = evaluateCancellationPacket(samplePacket);

assert.equal(result.decision, "block-cancellation-close");
assert.ok(result.findings.some((finding) => finding.id === "late-cancellation-notice"));
assert.ok(result.findings.some((finding) => finding.id === "unapproved-effective-date"));
assert.ok(result.findings.some((finding) => finding.id === "scheduled-renewal-invoice:inv-renew-991"));
assert.ok(result.findings.some((finding) => finding.id === "refund-without-review"));
assert.ok(result.findings.some((finding) => finding.id === "compute-credit-overhang:cc-ai-771"));
assert.ok(result.findings.some((finding) => finding.id === "analytics-export-overhang:lic-export-44"));
assert.ok(result.findings.some((finding) => finding.id === "po-closeout-missing"));

const cleanResult = evaluateCancellationPacket({
  accountId: "lab-clean",
  cancellationId: "can-clean",
  requestedAt: "2026-04-01",
  contractEndDate: "2026-06-01",
  effectiveDate: "2026-06-01",
  requiredNoticeDays: 30,
  refundDueCents: 0,
  computeWindDownDate: "2026-06-07",
  analyticsCutoffDate: "2026-06-01",
  institutionalPoException: false,
  renewalInvoices: [{ id: "inv-old", issueDate: "2026-05-01", status: "issued", amountCents: 50000 }],
  computeCreditLots: [{ id: "cc-zero", remainingUnits: 0, expiresAt: "2026-07-01" }],
  analyticsExportGrants: [{ id: "lic-ok", accessUntil: "2026-06-01" }]
});

assert.equal(cleanResult.decision, "ready-to-close");
assert.equal(cleanResult.findings.length, 0);

console.log("cancellation effective-date guard tests passed");
