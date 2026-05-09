import test from "node:test";
import assert from "node:assert/strict";
import { buildAdminDashboard, buildEnterprisePayload, buildExportPipeline, buildRestApiCatalog, createWebhookEvent } from "../src/enterprise-core.js";

test("builds enterprise admin dashboard metrics", () => {
  const dashboard = buildAdminDashboard();

  assert.equal(dashboard.overview.projects, 3);
  assert.ok(dashboard.overview.storageGb > 100);
  assert.ok(dashboard.departmentMetrics.some((item) => item.department === "Oncology"));
  assert.ok(dashboard.compliance.some((item) => item.status === "attention"));
});

test("exposes secure API catalog and enabled integrations", () => {
  const catalog = buildRestApiCatalog();

  assert.match(catalog.auth, /Bearer token/);
  assert.ok(catalog.routes.includes("POST /api/enterprise/webhooks"));
  assert.ok(catalog.integrations.some((integration) => integration.type === "lms"));
});

test("creates structured webhook events", () => {
  const event = createWebhookEvent("project.published", "proj-organoid");

  assert.equal(event.type, "project.published");
  assert.ok(event.deliveryTargets.length >= 2);
  assert.equal(event.payload.reproducibilityScore, 94);
});

test("builds export pipeline preserving scholarly metadata", () => {
  const pipeline = buildExportPipeline({ projectId: "proj-organoid", target: "Zenodo", format: "JATS" });
  const payload = buildEnterprisePayload();

  assert.ok(pipeline.plugins.includes("DataCite DOI"));
  assert.ok(pipeline.preservedMetadata.includes("ORCID"));
  assert.equal(payload.exportPipeline.complianceStatus, "ready");
});
