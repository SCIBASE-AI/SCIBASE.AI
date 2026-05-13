import test from "node:test";
import assert from "node:assert/strict";
import { apiSurface, institution, subscribers } from "../src/sample-data.js";
import {
  buildAdminDashboard,
  buildApiCatalog,
  buildComplianceExport,
  buildEnterpriseDashboard,
  buildFormattingPlugins,
  buildUsageAnalytics,
  planWebhookDelivery
} from "../src/tooling.js";

test("admin dashboard summarizes institutional posture", () => {
  const dashboard = buildAdminDashboard(institution);
  assert.equal(dashboard.seatUtilization, 84);
  assert.equal(dashboard.projectCount, 3);
  assert.equal(dashboard.accessPosture, "needs-review");
  assert.ok(dashboard.alerts.some((alert) => alert.includes("overdue access")));
});

test("usage analytics reports repository and review load", () => {
  const analytics = buildUsageAnalytics(institution);
  assert.equal(analytics.repositoryCount, 30);
  assert.equal(analytics.activeUsers30d, 104);
  assert.equal(analytics.reviewLoad.length, 3);
  assert.equal(analytics.trendDeltas.exports, "+18%");
});

test("compliance export includes controls and evidence files", () => {
  const compliance = buildComplianceExport(institution);
  assert.equal(compliance.manifestId, "inst-northbridge-compliance-2026-05-14");
  assert.equal(compliance.controls.find((control) => control.id === "access-review").status, "attention-needed");
  assert.ok(compliance.files.includes("audit-events.ndjson"));
});

test("API catalog assigns auth, rotation, and risk tiers", () => {
  const catalog = buildApiCatalog(apiSurface);
  assert.equal(catalog.length, 4);
  assert.equal(catalog.find((endpoint) => endpoint.path === "/v1/compliance/exports").rotationPolicyDays, 30);
  assert.equal(catalog.find((endpoint) => endpoint.path === "/v1/repositories").riskTier, "elevated");
});

test("webhook delivery plan models signing, retries, and subscriber health", () => {
  const webhooks = planWebhookDelivery(subscribers);
  assert.equal(webhooks.signing.algorithm, "HMAC-SHA256");
  assert.equal(webhooks.retryPolicy.attempts, 5);
  assert.ok(webhooks.eventCatalog.includes("api.key.rotated"));
  assert.equal(webhooks.subscribers.find((subscriber) => subscriber.id === "sub-lims").status, "needs-attention");
});

test("formatting plugin metadata covers enterprise exports", () => {
  const plugins = buildFormattingPlugins();
  assert.deepEqual(
    plugins.map((plugin) => plugin.id),
    ["citation-exporter", "manuscript-packager", "grant-report-builder", "compliance-binder"]
  );
  assert.ok(plugins.find((plugin) => plugin.id === "compliance-binder").formats.includes("zip"));
});

test("enterprise dashboard combines modules for review", () => {
  const dashboard = buildEnterpriseDashboard(institution, apiSurface, subscribers);
  assert.equal(dashboard.institutionId, institution.id);
  assert.equal(dashboard.catalog.length, 4);
  assert.equal(dashboard.plugins.length, 4);
  assert.equal(dashboard.webhooks.subscribers.filter((subscriber) => subscriber.status === "needs-attention").length, 1);
  assert.equal(dashboard.readyForEnterpriseReview, true);
});
