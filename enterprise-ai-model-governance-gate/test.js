"use strict";

const assert = require("node:assert/strict");
const { evaluateRequests, evaluateRequest, buildWebhookEvent } = require("./index");
const { modelCatalog, policies, requests } = require("./sample-data");

function testApprovedInternalModel() {
  const result = evaluateRequest(requests[0], new Map(modelCatalog.map((model) => [model.id, model])), policies);

  assert.equal(result.status, "approved");
  assert.deepEqual(result.allowedScopes, ["summarize", "peer-review-redlines"]);
  assert.equal(result.adminQueue, "enable");
}

function testRestrictedExternalModelHold() {
  const result = evaluateRequest(requests[1], new Map(modelCatalog.map((model) => [model.id, model])), policies);

  assert.equal(result.status, "hold");
  assert.ok(result.holds.includes("restricted-data-sent-to-external-model"));
  assert.ok(result.holds.includes("retention-window-too-long"));
  assert.ok(result.holds.includes("missing-vendor-dpa"));
  assert.deepEqual(result.missingApprovals, ["legal"]);
  assert.equal(result.adminQueue, "privacy-security-review");
}

function testBudgetAndBlockedIntegrationHold() {
  const result = evaluateRequest(requests[2], new Map(modelCatalog.map((model) => [model.id, model])), policies);

  assert.equal(result.status, "hold");
  assert.ok(result.holds.includes("model-not-approved"));
  assert.ok(result.holds.includes("token-budget-review-needed"));
  assert.ok(result.holds.includes("blocked-integration"));
}

function testMissingApprovalOnly() {
  const result = evaluateRequest(requests[3], new Map(modelCatalog.map((model) => [model.id, model])), policies);

  assert.equal(result.status, "needs-approval");
  assert.deepEqual(result.missingApprovals, ["registrar"]);
  assert.equal(result.adminQueue, "department-approval");
}

function testPackageSummaryAndWebhook() {
  const packet = evaluateRequests({ requests, modelCatalog, policies });
  const event = buildWebhookEvent(packet.results[0]);

  assert.deepEqual(packet.summary, { approved: 1, needsApproval: 1, hold: 2 });
  assert.equal(packet.webhookEvents.length, 4);
  assert.equal(event.type, "enterprise.ai_model_request.evaluated");
  assert.match(event.signature, /^[a-f0-9]{16}$/);
  assert.match(packet.auditDigest, /^[a-f0-9]{12}$/);
}

function run() {
  testApprovedInternalModel();
  testRestrictedExternalModelHold();
  testBudgetAndBlockedIntegrationHold();
  testMissingApprovalOnly();
  testPackageSummaryAndWebhook();
  console.log("enterprise-ai-model-governance-gate tests passed");
}

run();
