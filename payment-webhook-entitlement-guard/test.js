const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  evaluatePaymentWebhookActivation,
  buildMarkdownReport,
  buildSvgSummary,
  writeReportBundle
} = require("./index");
const { riskyPacket, cleanPacket } = require("./sample-data");

function testDuplicateWebhookBlocksDoubleGrant() {
  const result = evaluatePaymentWebhookActivation(riskyPacket);
  assert.strictEqual(result.status, "hold_entitlement_activation");
  assert(result.revenuePacket.blockers.some((blocker) => blocker.kind === "duplicate_webhook_event_id"));
  assert(result.revenuePacket.blockers.some((blocker) => blocker.kind === "double_credit_entitlement_grant"));
}

function testAmountMismatchBlocksActivation() {
  const result = evaluatePaymentWebhookActivation(riskyPacket);
  const mismatch = result.revenuePacket.blockers.find((blocker) => blocker.kind === "amount_or_currency_mismatch");
  assert(mismatch, "expected amount mismatch blocker");
  assert.strictEqual(mismatch.evidence.eventAmount, 490000);
  assert.strictEqual(mismatch.evidence.orderAmount, 500000);
}

function testStaleInvalidReversalRequiresHold() {
  const result = evaluatePaymentWebhookActivation(riskyPacket);
  assert(result.revenuePacket.blockers.some((blocker) => blocker.kind === "invalid_webhook_signature"));
  assert(result.revenuePacket.blockers.some((blocker) => blocker.kind === "stale_webhook_signature"));
  assert(result.revenuePacket.blockers.some((blocker) => blocker.kind === "payment_reversal_requires_entitlement_hold"));
  assert.strictEqual(result.summary.reversals, 1);
}

function testCleanPaymentActivates() {
  const result = evaluatePaymentWebhookActivation(cleanPacket);
  assert.strictEqual(result.status, "activate_paid_entitlements");
  assert.strictEqual(result.summary.blockers, 0);
  assert.strictEqual(result.revenuePacket.activationPlan.length, 1);
  assert.strictEqual(result.revenuePacket.activationPlan[0].orderId, "order-clean-300");
}

function testReportsRender() {
  const result = evaluatePaymentWebhookActivation(riskyPacket);
  const markdown = buildMarkdownReport(result);
  const svg = buildSvgSummary(result);
  assert(markdown.includes("Payment Webhook Entitlement Guard Report"));
  assert(markdown.includes("hold_entitlement_activation"));
  assert(svg.includes("<svg"));
  assert(svg.includes("Payment Webhook Entitlement Guard"));

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "payment-webhook-"));
  const paths = writeReportBundle(result, outputDir);
  assert(fs.existsSync(paths.jsonPath));
  assert(fs.existsSync(paths.markdownPath));
  assert(fs.existsSync(paths.svgPath));
}

function run() {
  testDuplicateWebhookBlocksDoubleGrant();
  testAmountMismatchBlocksActivation();
  testStaleInvalidReversalRequiresHold();
  testCleanPaymentActivates();
  testReportsRender();
  console.log("5 payment webhook entitlement guard tests passed");
}

run();
