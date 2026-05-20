"use strict";

const crypto = require("node:crypto");

const HIGH_RISK_DATA = new Set(["human-subject", "clinical", "restricted-ip", "student-record"]);
const REQUIRED_REVIEWERS = {
  "human-subject": "irb",
  clinical: "privacy",
  "restricted-ip": "legal",
  "student-record": "registrar",
};

function evaluateRequests({ requests, modelCatalog, policies }) {
  const catalog = new Map(modelCatalog.map((model) => [model.id, model]));
  const results = requests.map((request) => evaluateRequest(request, catalog, policies));

  return {
    generatedAt: new Date("2026-05-20T08:00:00.000Z").toISOString(),
    summary: buildSummary(results),
    results,
    webhookEvents: results.map(buildWebhookEvent),
    auditDigest: digest(results),
  };
}

function evaluateRequest(request, catalog, policies) {
  const model = catalog.get(request.modelId);
  const holds = [];
  const approvals = [];

  if (!model) {
    holds.push("unknown-model");
  } else {
    if (!model.approved) holds.push("model-not-approved");
    if (model.dataBoundary === "external" && request.dataClasses.some((dataClass) => HIGH_RISK_DATA.has(dataClass))) {
      holds.push("restricted-data-sent-to-external-model");
    }
    if (model.maxRetentionDays > policies.maxRetentionDays) {
      holds.push("retention-window-too-long");
    }
    if (!model.vendorDpa && request.dataClasses.some((dataClass) => HIGH_RISK_DATA.has(dataClass))) {
      holds.push("missing-vendor-dpa");
    }
  }

  for (const dataClass of request.dataClasses) {
    const reviewer = REQUIRED_REVIEWERS[dataClass];
    if (reviewer && !request.approvals.includes(reviewer)) {
      approvals.push(reviewer);
    }
  }

  if (request.monthlyTokenEstimate > policies.maxMonthlyTokens) {
    holds.push("token-budget-review-needed");
  }

  if (request.integrations.some((integration) => policies.blockedIntegrations.includes(integration))) {
    holds.push("blocked-integration");
  }

  const status = holds.length ? "hold" : approvals.length ? "needs-approval" : "approved";

  return {
    id: request.id,
    lab: request.lab,
    modelId: request.modelId,
    status,
    holds,
    missingApprovals: approvals,
    adminQueue: buildAdminQueue(status, holds, approvals),
    allowedScopes: status === "approved" ? request.requestedScopes : [],
    exportEvidence: {
      dataClasses: request.dataClasses,
      integrations: request.integrations,
      modelBoundary: model ? model.dataBoundary : "unknown",
      retentionDays: model ? model.maxRetentionDays : null,
    },
  };
}

function buildAdminQueue(status, holds, approvals) {
  if (status === "approved") return "enable";
  if (holds.includes("restricted-data-sent-to-external-model")) return "privacy-security-review";
  if (holds.includes("missing-vendor-dpa")) return "vendor-contract-review";
  if (holds.length) return "platform-admin-review";
  if (approvals.length) return "department-approval";
  return "review";
}

function buildSummary(results) {
  return {
    approved: results.filter((result) => result.status === "approved").length,
    needsApproval: results.filter((result) => result.status === "needs-approval").length,
    hold: results.filter((result) => result.status === "hold").length,
  };
}

function buildWebhookEvent(result) {
  return {
    type: "enterprise.ai_model_request.evaluated",
    requestId: result.id,
    status: result.status,
    queue: result.adminQueue,
    signature: crypto
      .createHash("sha256")
      .update(`${result.id}:${result.status}:${result.adminQueue}`)
      .digest("hex")
      .slice(0, 16),
  };
}

function digest(results) {
  return crypto
    .createHash("sha256")
    .update(results.map((result) => `${result.id}:${result.status}:${result.holds.join(",")}`).join("|"))
    .digest("hex")
    .slice(0, 12);
}

module.exports = {
  evaluateRequests,
  evaluateRequest,
  buildWebhookEvent,
};
