"use strict";

const assert = require("assert");
const { auditCreditLedger, renderMarkdownReport, computeReputation, daysBetween, normalizeRole } = require("./index");
const { researcherProfile } = require("./sample-data");

assert.strictEqual(normalizeRole("Writing / Review & Editing"), "writing   review   editing");
assert.strictEqual(daysBetween("2026-01-10T10:00:00Z", "2026-02-18T10:00:00Z"), 39);

const computed = computeReputation(researcherProfile, { signedCredits: 9, undisputedCredits: 9 });
assert.ok(computed.total < researcherProfile.reputation.total, "fixture should contain inflated stored reputation");

const report = auditCreditLedger(researcherProfile);
const codes = new Set(report.findings.map((finding) => finding.code));

assert.strictEqual(report.summary.decision, "hold-reputation-publication");
assert.strictEqual(report.summary.riskScore, 100);
assert.ok(codes.has("INVALID_CREDIT_ROLE"), "missing invalid CRediT role detection");
assert.ok(codes.has("DUPLICATE_CREDIT_EVENT"), "missing duplicate credit detection");
assert.ok(codes.has("LATE_CREDIT_BACKFILL"), "missing late backfill detection");
assert.ok(codes.has("DISPUTED_CREDIT_INCLUDED"), "missing disputed credit exclusion detection");
assert.ok(codes.has("UNSIGNED_CONTRIBUTION"), "missing attestation detection");
assert.ok(codes.has("REPUTATION_COMPONENT_MISMATCH"), "missing reputation formula mismatch detection");
assert.ok(codes.has("BADGE_ELIGIBILITY_DRIFT"), "missing badge drift detection");
assert.ok(codes.has("REVIEW_QUALITY_OUTLIER"), "missing peer review quality outlier detection");
assert.ok(codes.has("MISSING_PROJECT_TIMELINE_LINK"), "missing timeline link detection");

const repeat = auditCreditLedger(researcherProfile);
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "digest should be stable");

const markdown = renderMarkdownReport(report);
assert.ok(markdown.includes("Credit Ledger Reputation Audit"));
assert.ok(markdown.includes("hold-reputation-publication"));
assert.ok(markdown.includes(report.summary.auditDigest));

console.log("credit-ledger-reputation-auditor tests passed");
