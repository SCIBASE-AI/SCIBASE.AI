const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildRevenueClose, validateCloseInput } = require("../src/revenue-close");

const samplePath = path.join(__dirname, "..", "data", "sample-close.json");
const closeInput = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const close = buildRevenueClose(closeInput);

assert.equal(close.validation.status, "passed");
assert.equal(close.contracts.length, 3);
assert.equal(close.totals.recognizedThisPeriod, 7936.3);
assert.equal(close.totals.deferredAfterClose, 13304.79);
assert.equal(close.totals.receivableAtClose, 12200);
assert.equal(close.totals.cashCollected, 12000);
assert.equal(close.dashboard.status, "attention-needed");

const subscription = close.contracts.find((contract) => contract.id === "sub-lab-annual");
assert.equal(subscription.revenue.method, "ratable-service-period");
assert.equal(subscription.revenue.recognizedThisPeriod, 986.3);
assert.equal(subscription.closeStatus, "closed");

const compute = close.contracts.find((contract) => contract.id === "compute-foundation-burst");
assert.equal(compute.revenue.method, "billable-usage-events");
assert.equal(compute.revenue.recognizedThisPeriod, 1950);
assert.equal(compute.revenue.deferredAfterClose, 1250);
assert.equal(compute.payment.status, "open-receivable");
assert.equal(compute.dunning.status, "not-needed");
assert.equal(compute.closeStatus, "closed-with-receivable");
assert.equal(compute.revenue.evidence.length, 2);

const license = close.contracts.find((contract) => contract.id === "license-policy-api");
assert.equal(license.revenue.method, "accepted-license-deliverables");
assert.equal(license.revenue.recognizedThisPeriod, 5000);
assert.equal(license.revenue.deferredAfterClose, 4000);
assert.equal(license.dunning.status, "queued");
assert.equal(license.dunning.action, "finance-review");
assert.equal(license.holds.length, 2);
assert.ok(close.auditTrail.some((event) => event.type === "dunning-queued"));
assert.ok(close.auditTrail.some((event) => event.type === "close-hold" && event.holdType === "credit-review"));
assert.equal(close.digest, buildRevenueClose(closeInput).digest);

const incomplete = validateCloseInput({ closeId: "draft" });
assert.equal(incomplete.status, "incomplete");
assert.ok(incomplete.missing.includes("periodStart"));

const noDunningInput = JSON.parse(JSON.stringify(closeInput));
noDunningInput.contracts[2].paidAt = "2026-04-20T09:00:00Z";
noDunningInput.contracts[2].credits = [];
const noDunningClose = buildRevenueClose(noDunningInput);
assert.equal(noDunningClose.dunningQueue.length, 0);
assert.equal(noDunningClose.creditAndRefundHolds.length, 0);

console.log("revenue-recognition-close tests passed");
