"use strict";

const assert = require("assert");
const { analyzeChallengePayout, renderMarkdownReport, centsToUsd } = require("./index");
const { biomarkerChallenge } = require("./sample-data");

const report = analyzeChallengePayout(biomarkerChallenge);
const codes = new Set(report.findings.map((finding) => finding.code));

assert.strictEqual(report.summary.decision, "hold-award-routing");
assert.strictEqual(report.summary.riskScore, 100);
assert.strictEqual(report.summary.splitTotal, 105);
assert.strictEqual(centsToUsd(25000000), "$250,000.00");
assert.ok(codes.has("ESCROW_UNDERFUNDED"), "missing escrow coverage detection");
assert.ok(codes.has("MILESTONE_TOTAL_MISMATCH"), "missing milestone mismatch detection");
assert.ok(codes.has("MILESTONE_ACCEPTANCE_GAP"), "missing milestone acceptance checks");
assert.ok(codes.has("SPLIT_TOTAL_INVALID"), "missing split total validation");
assert.ok(codes.has("PAYEE_PAYOUT_NOT_READY"), "missing payee readiness validation");
assert.ok(codes.has("INSTITUTION_TAX_FORM_MISSING"), "missing institution tax check");
assert.ok(codes.has("PREPAYMENT_IP_TRANSFER"), "missing IP transfer timing check");
assert.ok(codes.has("UNBUDGETED_HONORABLE_MENTION"), "missing honorable mention reserve check");
assert.ok(codes.has("WEAK_ARBITRATION_PANEL"), "missing arbitration panel check");
assert.ok(codes.has("NDA_TEMPLATE_MISSING"), "missing NDA template check");

const repeat = analyzeChallengePayout(biomarkerChallenge);
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "digest should be stable");

const markdown = renderMarkdownReport(report);
assert.ok(markdown.includes("Milestone Payout Routing Audit"));
assert.ok(markdown.includes("hold-award-routing"));
assert.ok(markdown.includes(report.summary.auditDigest));

console.log("milestone-payout-routing-auditor tests passed");
