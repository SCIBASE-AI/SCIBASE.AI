"use strict";

const assert = require("assert");
const {
  analyzePriceEscalations,
  basisPointsIncrease,
  daysBetween,
  formatUsd,
} = require("./priceEscalationCapGuard");
const { sampleRenewals } = require("./sampleRenewals");

assert.strictEqual(daysBetween("2026-05-31", "2026-07-15"), 45);
assert.strictEqual(basisPointsIncrease(100000, 108000), 800);
assert.strictEqual(formatUsd(123456), "$1234.56");

const packet = analyzePriceEscalations(sampleRenewals);
assert.strictEqual(packet.status, "hold");
assert.strictEqual(packet.summary.renewals, 5);
assert.strictEqual(packet.summary.release, 1);
assert.strictEqual(packet.summary.review, 1);
assert.strictEqual(packet.summary.hold, 3);

const overCap = packet.decisions.find((item) => item.renewalId === "ren-over-cap");
assert(overCap);
assert.strictEqual(overCap.decision, "hold");
assert(overCap.findings.some((finding) => finding.code === "CONTRACT_CAP_EXCEEDED"));

const stale = packet.decisions.find((item) => item.renewalId === "ren-stale-cpi");
assert(stale);
assert.strictEqual(stale.decision, "review");
assert(stale.findings.some((finding) => finding.code === "STALE_CPI_EVIDENCE"));

const lateNotice = packet.decisions.find((item) => item.renewalId === "ren-late-notice");
assert(lateNotice);
assert.strictEqual(lateNotice.decision, "hold");
assert(lateNotice.findings.some((finding) => finding.code === "NOTICE_WINDOW_SHORT"));

const priceLocked = packet.decisions.find((item) => item.renewalId === "ren-price-locked");
assert(priceLocked);
assert.strictEqual(priceLocked.decision, "hold");
assert(priceLocked.findings.some((finding) => finding.code === "PRICE_LOCK_ACTIVE"));
assert(priceLocked.findings.some((finding) => finding.code === "EXCLUDED_ACCOUNT_APPROVAL_REVIEW"));

const clean = analyzePriceEscalations({
  checkedAt: "2026-05-31T09:15:00.000Z",
  renewals: [
    {
      id: "ren-clean",
      customer: "Clean Lab",
      segment: "institutional",
      renewalDate: "2026-08-01",
      currentAnnualCents: 100000,
      proposedAnnualCents: 105000,
      contract: { upliftCapBps: 600, priceLockUntil: "2026-07-31", requiresNoticeDays: 45 },
      cpiEvidence: { source: "national-statistics-office", valueBps: 500, observedAt: "2026-04-30" },
      notice: { sentAt: "2026-05-31", channel: "billing-admin-email" },
    },
  ],
});
assert.strictEqual(clean.status, "release");
assert.strictEqual(clean.summary.release, 1);

const empty = analyzePriceEscalations({ renewals: [] });
assert.strictEqual(empty.status, "release");
assert.strictEqual(empty.warnings[0].code, "NO_RENEWALS");

console.log("revenue-price-escalation-cap-guard tests passed");
