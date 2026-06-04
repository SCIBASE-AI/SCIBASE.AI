"use strict";

const assert = require("node:assert/strict");
const scenarios = require("./fixtures/scenarios.json");
const { evaluateAccount, evaluatePortfolio } = require("./guard");

function byId(id) {
  return scenarios.accounts.find((account) => account.id === id);
}

function codes(result) {
  return result.findings.map((finding) => finding.code);
}

const clean = evaluateAccount(byId("acct-clean-lab"), scenarios);
assert.equal(clean.action, "RELEASE_INVOICE");
assert.equal(clean.findings.length, 0);
assert.equal(clean.netInvoiceCents, 682560);

const repeatTrial = evaluateAccount(byId("acct-repeat-trial"), scenarios);
assert.equal(repeatTrial.action, "HOLD_INVOICE");
assert.ok(codes(repeatTrial).includes("trial_reuse"));
assert.ok(codes(repeatTrial).includes("trial_overrun"));
assert.ok(codes(repeatTrial).includes("missing_conversion_evidence"));
assert.ok(codes(repeatTrial).includes("coupon_missing_conversion_evidence"));

const expiredCoupon = evaluateAccount(byId("acct-expired-coupon"), scenarios);
assert.equal(expiredCoupon.action, "HOLD_INVOICE");
assert.ok(codes(expiredCoupon).includes("expired_coupon"));

const consortiumMismatch = evaluateAccount(byId("acct-consortium-mismatch"), scenarios);
assert.equal(consortiumMismatch.action, "HOLD_INVOICE");
assert.ok(codes(consortiumMismatch).includes("consortium_ineligible"));
assert.ok(codes(consortiumMismatch).includes("discount_cap_exceeded"));

const stacked = evaluateAccount(byId("acct-stack-conflict"), scenarios);
assert.equal(stacked.action, "HOLD_INVOICE");
assert.ok(codes(stacked).includes("non_stackable_coupon_combo"));
assert.ok(codes(stacked).includes("discount_cap_exceeded"));

const portfolio = evaluatePortfolio(scenarios);
assert.equal(portfolio.summary.accountCount, 5);
assert.equal(portfolio.summary.releaseCount, 1);
assert.equal(portfolio.summary.holdCount, 4);
assert.equal(portfolio.summary.reviewCount, 0);
assert.ok(portfolio.summary.totalAtRiskCents > 0);

console.log("revenue trial pricing guard tests passed");
