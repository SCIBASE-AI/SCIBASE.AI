"use strict";

const assert = require("assert");
const {
  auditUsageMetering,
  renderMarkdownReport,
  findDuplicateTopups,
  providerRevenueTotals,
  money,
} = require("./index");
const { institutionalAccount } = require("./sample-data");

assert.strictEqual(money(123456), "$1,234.56");
assert.strictEqual(findDuplicateTopups(institutionalAccount.topups).length, 1);
assert.strictEqual(providerRevenueTotals(institutionalAccount.paymentProviderBalances).spreadCents, 23000);

const report = auditUsageMetering(institutionalAccount);
const codes = new Set(report.findings.map((finding) => finding.code));

assert.strictEqual(report.summary.decision, "hold-revenue-close");
assert.strictEqual(report.summary.riskScore, 100);
assert.strictEqual(report.summary.totalComputeUnits, 1220);
assert.strictEqual(report.summary.effectiveComputeQuota, 1200);
assert.ok(codes.has("USAGE_NOT_BILLED"), "missing unbilled usage detection");
assert.ok(codes.has("OVER_QUOTA_NOT_BLOCKED"), "missing quota enforcement detection");
assert.ok(codes.has("DISCOUNT_EXCEEDS_POLICY"), "missing discount policy detection");
assert.ok(codes.has("INSTITUTIONAL_PO_MISSING"), "missing PO metadata detection");
assert.ok(codes.has("LICENSED_API_OVERAGE"), "missing analytics API overage detection");
assert.ok(codes.has("FREE_TRIAL_COMPUTE_LEAK"), "missing trial compute leak detection");
assert.ok(codes.has("PLAN_ENTITLEMENT_MISMATCH"), "missing plan entitlement detection");
assert.ok(codes.has("TOPUP_DOUBLE_COUNTED"), "missing top-up duplicate detection");
assert.ok(codes.has("PRIVATE_CONTENT_LICENSED"), "missing private export detection");
assert.ok(codes.has("PAYMENT_PROVIDER_DRIFT"), "missing provider reconciliation detection");

const repeat = auditUsageMetering(institutionalAccount);
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "digest should be stable");

const markdown = renderMarkdownReport(report);
assert.ok(markdown.includes("Usage Meter Entitlement Audit"));
assert.ok(markdown.includes("hold-revenue-close"));
assert.ok(markdown.includes(report.summary.auditDigest));

console.log("usage-meter-entitlement-auditor tests passed");
