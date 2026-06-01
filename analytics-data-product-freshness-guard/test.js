const assert = require("node:assert/strict");
const { evaluateFreshnessPacket, renderMarkdownReport, renderSvgSummary } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function codes(evaluation) {
  return new Set(evaluation.findings.map((finding) => finding.code));
}

const clean = evaluateFreshnessPacket(cleanPacket);
assert.equal(clean.summary.decision, "release_analytics_invoice");
assert.equal(clean.findings.length, 0);
assert.equal(clean.summary.netInvoiceCents, cleanPacket.contract.monthlyFeeCents);

const risky = evaluateFreshnessPacket(riskyPacket);
assert.equal(risky.summary.decision, "hold_analytics_invoice");
assert.equal(codes(risky).has("SNAPSHOT_STALE"), true);
assert.equal(codes(risky).has("METRIC_COVERAGE_INCOMPLETE"), true);
assert.equal(codes(risky).has("ANONYMIZATION_THRESHOLD_BREACH"), true);
assert.equal(codes(risky).has("SOURCE_PROJECT_WITHDRAWAL_UNRESOLVED"), true);
assert.equal(codes(risky).has("SOURCE_EMBARGO_UNRESOLVED"), true);
assert.equal(codes(risky).has("REPRODUCIBILITY_FEED_STALE"), true);
assert.equal(codes(risky).has("DELIVERY_EVIDENCE_MISSING"), true);
assert.ok(risky.summary.recommendedCreditCents > 0);

const creditOnly = clone(cleanPacket);
creditOnly.analyticsProduct.snapshot.generatedAt = "2026-05-17";
creditOnly.deliveryEvidence.deliveredAt = "2026-05-18";
const credit = evaluateFreshnessPacket(creditOnly);
assert.equal(credit.summary.decision, "invoice_with_freshness_credit");
assert.equal(codes(credit).has("SNAPSHOT_IN_GRACE_WINDOW"), true);
assert.ok(credit.summary.recommendedCreditCents > 0);
assert.ok(credit.summary.netInvoiceCents < credit.summary.monthlyFeeCents);

const markdown = renderMarkdownReport(riskyPacket, risky);
assert.match(markdown, /Analytics Data Product Freshness Review/);
assert.match(markdown, /hold_analytics_invoice/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Analytics Data Product Freshness Guard/);

console.log("analytics-data-product-freshness-guard tests passed");
