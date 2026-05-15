"use strict";

const assert = require("node:assert/strict");
const sampleBundle = require("./sample-data.json");
const {
  analyzeRevenueTaxControls,
  stableHash,
} = require("./src/revenue-tax-exemption-controls");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ids(result) {
  return new Set(result.findings.map((finding) => finding.id));
}

const held = analyzeRevenueTaxControls(sampleBundle);
const heldIds = ids(held);

assert.equal(held.decision, "billing-hold");
assert.match(held.auditDigest, /^sha256:[a-f0-9]{64}$/);
assert(heldIds.has("exemption-certificate-expired"));
assert(heldIds.has("grant-budget-exceeded"));
assert(heldIds.has("grant-category-disallowed"));
assert(heldIds.has("settlement-amount-mismatch"));
assert(heldIds.has("reverse-charge-vat-id-missing"));
assert.equal(held.invoiceSummaries.find((item) => item.invoiceId === "inv-1007").recommendedAction, "billing-hold");

const billableBundle = clone(sampleBundle);
billableBundle.customers[0].taxProfile.exemptionCertificate.expiresAt = "2026-12-31T00:00:00.000Z";
billableBundle.customers[1].taxProfile.vatId = "DE123456789";
billableBundle.grantBudgets[0].approvedCents = 330000;
billableBundle.grantBudgets[0].allowedCategories.push("compute");
billableBundle.settlementEvents[0].amountCents = 54000;

const billable = analyzeRevenueTaxControls(billableBundle);
assert.equal(billable.decision, "billable");
assert.equal(billable.findings.length, 0);
assert.equal(billable.invoiceSummaries.every((item) => item.recommendedAction === "issue-invoice"), true);
assert.notEqual(held.auditDigest, billable.auditDigest);
assert.equal(stableHash({ b: 2, a: 1 }), stableHash({ a: 1, b: 2 }));

console.log("revenue tax exemption control tests passed");
