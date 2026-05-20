const assert = require("node:assert/strict");
const { evaluateInvoiceAcceptance, daysBetween } = require("./index");
const sampleAccounts = require("./sample-data");

const result = evaluateInvoiceAcceptance(sampleAccounts, {
  asOf: "2026-05-20T00:00:00.000Z",
});

assert.equal(daysBetween("2026-05-01", "2026-05-20"), 19);
assert.equal(result.summary.count, 5);
assert.equal(result.summary.totalAmount, 43250);
assert.equal(result.summary.byReadiness.ready_to_invoice, 18950);
assert.equal(result.summary.byReadiness.needs_review, 4200);
assert.equal(result.summary.byReadiness.blocked, 20100);
assert.equal(result.summary.byRevenueStream.subscription, 18950);
assert.equal(result.summary.byRevenueStream.data_license, 12500);
assert.equal(result.actionQueue.length, 3);

const ready = result.rows.find((row) => row.eventId === "sub-q2-institutional-seat-pack");
assert.equal(ready.readiness, "ready_to_invoice");
assert.equal(ready.evidenceScore, 100);

const pending = result.rows.find((row) => row.eventId === "ai-compute-may-burst");
assert.equal(pending.readiness, "needs_review");
assert.deepEqual(pending.reasons, ["pending_acceptance"]);

const rejected = result.rows.find((row) => row.eventId === "license-export-wave-3");
assert.equal(rejected.readiness, "blocked");
assert.ok(rejected.reasons.includes("rejected_evidence"));
assert.ok(rejected.reasons.includes("evidence_score_below_policy"));
assert.ok(rejected.reasons.includes("aging_unbilled_revenue"));

const missing = result.rows.find((row) => row.eventId === "reproducibility-milestone-2");
assert.equal(missing.readiness, "blocked");
assert.ok(missing.reasons.includes("missing_evidence"));

assert.match(result.auditDigest, /^[a-f0-9]{16}$/);

const repeated = evaluateInvoiceAcceptance(sampleAccounts, {
  asOf: "2026-05-20T00:00:00.000Z",
});
assert.equal(repeated.auditDigest, result.auditDigest);

console.log("invoice-acceptance-evidence-gate tests passed");
