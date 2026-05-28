"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const charges = require("./data/sample-charges.json");
const { evaluateCharge, evaluateCharges, summarizeDecisions } = require("./guard");

test("approves eligible grant-backed AI compute usage", () => {
  const decision = evaluateCharge(charges[0]);

  assert.equal(decision.decision, "approve");
  assert.deepEqual(decision.reasons, []);
  assert.equal(decision.amounts.held, 0);
  assert.equal(decision.amounts.approvedCostShare, 900);
});

test("holds charges outside award dates and strips disallowed indirect costs", () => {
  const decision = evaluateCharge(charges[1]);

  assert.equal(decision.decision, "hold");
  assert.ok(decision.reasons.includes("outside_award_period"));
  assert.ok(decision.reasons.includes("missing_department_approval"));
  assert.ok(decision.reasons.includes("indirect_costs_excluded"));
  assert.equal(decision.amounts.held, 1800);
});

test("detects category, privacy, commercial use, approval, cap, and indirect-rate issues", () => {
  const decision = evaluateCharge(charges[2]);

  assert.equal(decision.decision, "hold");
  assert.ok(decision.reasons.includes("category_not_allowed"));
  assert.ok(decision.reasons.includes("missing_pi_approval"));
  assert.ok(decision.reasons.includes("private_project_restricted"));
  assert.ok(decision.reasons.includes("commercial_use_restricted"));
  assert.ok(decision.reasons.includes("cost_share_cap_exceeded"));
  assert.ok(decision.reasons.includes("indirect_rate_above_cap"));
  assert.equal(decision.amounts.reroute, 1800);
});

test("summarizes finance exposure for reviewer packets", () => {
  const decisions = evaluateCharges(charges);
  const summary = summarizeDecisions(decisions);

  assert.deepEqual(summary, {
    total: 3,
    approve: 1,
    hold: 2,
    heldAmount: 11300,
    rerouteAmount: 2000,
  });
});
