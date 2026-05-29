const assert = require("assert");
const { billingBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const report = evaluateBatch(billingBatch);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["keep-active"], 1);
assert.strictEqual(report.summary["finance-exception"], 1);
assert.strictEqual(report.summary["hold-entitlements"], 2);

const institutional = report.accounts.find((account) => account.id === "acct-inst-2");
assert.strictEqual(institutional.decision, "finance-exception");
assert(institutional.actions.some((action) => action.includes("institutional billing")));

const compute = report.accounts.find((account) => account.id === "acct-ai-3");
assert(compute.findings.some((finding) => finding.includes("retry limit")));
assert(compute.findings.some((finding) => finding.includes("compute credits")));

const analytics = report.accounts.find((account) => account.id === "acct-api-4");
assert(analytics.findings.some((finding) => finding.includes("missing day-7")));
assert(analytics.findings.some((finding) => finding.includes("analytics license export")));

console.log("revenue-dunning-entitlement-hold-guard tests passed");
