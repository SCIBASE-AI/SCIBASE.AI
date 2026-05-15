const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  buildEnvelope,
  createWebhookLedger,
  digest,
  stableStringify,
  validateManifest
} = require("../src/webhook-ledger");

const samplePath = path.join(__dirname, "..", "data", "sample-enterprise-events.json");

function loadSample() {
  return JSON.parse(fs.readFileSync(samplePath, "utf8"));
}

test("classifies delivered, dead-letter, replay-ready, and manual-review states", () => {
  const ledger = createWebhookLedger(loadSample());

  assert.equal(ledger.health, "degraded");
  assert.equal(ledger.summary.totalDeliveries, 4);
  assert.equal(ledger.summary.delivered, 2);
  assert.equal(ledger.summary.deadLetter, 2);
  assert.equal(ledger.summary.replayReady, 1);
  assert.equal(ledger.summary.manualReview, 1);
});

test("marks approved Canvas delivery as replayable after failed attempts", () => {
  const ledger = createWebhookLedger(loadSample());
  const delivery = ledger.deliveries.find((item) => item.destinationId === "canvas-lms");

  assert.equal(delivery.state, "dead-letter");
  assert.equal(delivery.replayable, true);
  assert.equal(delivery.approval.approvedBy, "enterprise-admin:northbridge-research-office");
  assert.match(delivery.idempotencyKey, /^[a-f0-9]{24}$/);
});

test("holds grant portal failures for manual review when replay approval is missing", () => {
  const ledger = createWebhookLedger(loadSample());
  const delivery = ledger.deliveries.find((item) => item.destinationId === "grant-portal");

  assert.equal(delivery.state, "manual-review");
  assert.equal(delivery.replayable, false);
  assert.match(delivery.reason, /approval/);
});

test("builds stable signed envelopes for idempotent delivery", () => {
  const manifest = loadSample();
  const event = manifest.events[0];
  const destination = manifest.destinations[0];
  const first = buildEnvelope(manifest, event, destination);
  const second = buildEnvelope(manifest, event, destination);

  assert.deepEqual(first, second);
  assert.match(first.idempotencyKey, /^[a-f0-9]{24}$/);
  assert.match(first.bodyDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(first.signaturePreview, /^sha256:[a-f0-9]{17}$/);
});

test("creates replay plans with retention windows", () => {
  const ledger = createWebhookLedger(loadSample());

  assert.equal(ledger.replayPlans.length, 2);
  assert.equal(
    ledger.replayPlans.some((plan) => plan.eventId === "evt-review-completed-017" && plan.replayable),
    true
  );
  assert.equal(
    ledger.replayPlans.some((plan) => plan.eventId === "evt-compliance-failed-006" && !plan.replayable),
    true
  );
});

test("validates destination and event manifest shape", () => {
  const manifest = loadSample();
  manifest.destinations[0].endpoint = "http://repo.example.edu/webhooks/scibase";

  const errors = validateManifest(manifest);

  assert.equal(errors.some((error) => error.includes("https endpoint")), true);
});

test("uses deterministic stable digests for audit evidence", () => {
  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };

  assert.equal(stableStringify(left), stableStringify(right));
  assert.equal(digest(left), digest(right));
  assert.match(digest(left), /^sha256:[a-f0-9]{64}$/);
});
