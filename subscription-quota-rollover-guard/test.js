import assert from "node:assert/strict";
import { auditQuotaRollover, buildFinanceMarkdown, buildSummarySvg } from "./index.js";
import { cleanQuotaLedger, riskyQuotaLedger } from "./sample-data.js";

const risky = auditQuotaRollover(riskyQuotaLedger);
assert.equal(risky.decision, "hold-invoice");
assert.ok(risky.riskScore >= 90);
assert.ok(risky.findings.some((finding) => finding.code === "ROLLOVER_CAP_EXCEEDED"));
assert.ok(risky.findings.some((finding) => finding.code === "EXPIRED_ROLLOVER_APPLIED"));
assert.ok(risky.findings.some((finding) => finding.code === "DUPLICATE_ROLLOVER_LOT"));
assert.ok(risky.findings.some((finding) => finding.code === "DOWNGRADE_CARRY_LIMIT_EXCEEDED"));
assert.ok(risky.findings.some((finding) => finding.code === "OVERAGE_DOUBLE_BILLING_RISK"));
assert.ok(risky.findings.some((finding) => finding.code === "MISSING_FINANCE_HOLD"));

const clean = auditQuotaRollover(cleanQuotaLedger);
assert.equal(clean.decision, "ready-to-invoice");
assert.equal(clean.riskScore, 0);
assert.equal(clean.summary.findingCount, 0);

assert.throws(() => auditQuotaRollover(undefined), /quota ledger must be an object/);

const markdown = buildFinanceMarkdown(risky);
assert.match(markdown, /hold-invoice/);
assert.match(markdown, /ROLLOVER_CAP_EXCEEDED/);

const svg = buildSummarySvg(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Subscription Quota Rollover Guard/);

console.log("subscription quota rollover guard tests passed");
