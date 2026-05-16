"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  addDays,
  daysUntil,
  evaluatePortfolio,
  signEvent,
  stableStringify
} = require("../src/grant-portfolio-compliance");

const sample = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "sample-grant-portfolio.json"), "utf8")
);

test("evaluates grant portfolio summary and export decisions", () => {
  const result = evaluatePortfolio(sample);

  assert.equal(result.summary.totalGrants, 3);
  assert.equal(result.summary.readyForExport, 1);
  assert.equal(result.summary.needsReview, 1);
  assert.equal(result.summary.blocked, 1);
  assert.deepEqual(result.exportManifest.readyGrantIds, ["HORIZON-CLIMATE-782"]);
  assert.deepEqual(result.exportManifest.blockedGrantIds, ["NIH-R01-NEURO-142"]);
  assert.deepEqual(result.exportManifest.needsReviewGrantIds, ["UKRI-QUANTUM-008"]);
});

test("surfaces blocker and warning obligations for an at-risk grant", () => {
  const result = evaluatePortfolio(sample);
  const grant = result.grants.find((candidate) => candidate.grantId === "NIH-R01-NEURO-142");

  assert.equal(grant.exportReadiness.decision, "blocked");
  assert.equal(grant.riskLevel, "critical");
  assert.equal(grant.obligationCounts.blocker, 6);
  assert.equal(grant.obligationCounts.warning, 4);
  assert.ok(grant.obligations.some((obligation) => obligation.scope === "data-management-plan"));
  assert.ok(grant.obligations.some((obligation) => obligation.scope === "repository-deposit"));
  assert.ok(grant.actionQueue.every((action) => action.owner));
});

test("keeps soon-due funder reports in review without blocking export", () => {
  const result = evaluatePortfolio(sample);
  const grant = result.grants.find((candidate) => candidate.grantId === "UKRI-QUANTUM-008");

  assert.equal(grant.exportReadiness.decision, "needs_review");
  assert.equal(grant.obligationCounts.blocker, 0);
  assert.equal(grant.obligationCounts.warning, 1);
  assert.equal(grant.obligations[0].daysUntilDue, 6);
  assert.match(grant.obligations[0].title, /due in 6 day/);
});

test("creates deterministic signed events for webhook-ready integrations", () => {
  const payload = {
    type: "grant.compliance.evaluated",
    grantId: "HORIZON-CLIMATE-782",
    status: "compliant",
    complianceScore: 100
  };

  const first = signEvent(payload, "test-secret");
  const second = signEvent(
    {
      complianceScore: 100,
      status: "compliant",
      grantId: "HORIZON-CLIMATE-782",
      type: "grant.compliance.evaluated"
    },
    "test-secret"
  );

  assert.equal(first.digest, second.digest);
  assert.equal(first.signature, second.signature);
  assert.equal(first.digest.length, 64);
  assert.equal(first.signature.length, 64);
});

test("normalizes date helpers for mandate due-date calculations", () => {
  assert.equal(daysUntil(new Date("2026-05-16T00:00:00.000Z"), "2026-05-22"), 6);
  assert.equal(addDays("2026-05-16", 30), "2026-06-15");
  assert.equal(stableStringify({ b: 2, a: 1 }), "{\"a\":1,\"b\":2}");
});
