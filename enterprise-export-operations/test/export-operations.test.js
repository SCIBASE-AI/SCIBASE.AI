import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoReport } from "../src/demo.js";
import { handleEnterpriseRequest } from "../src/api.js";
import { institution } from "../src/sample-data.js";
import {
  buildAdminDashboard,
  buildComplianceManifest,
  buildExportPackage,
  buildWebhookEvents,
  listApiCatalog,
  listExportTargets,
  listFormattingPlugins
} from "../src/export-operations.js";

test("summarizes institutional dashboard metrics", () => {
  const dashboard = buildAdminDashboard(institution);

  assert.equal(dashboard.projectCount, 3);
  assert.equal(dashboard.publicProjectRate, 67);
  assert.equal(dashboard.openScienceComplianceRate, 67);
  assert.equal(dashboard.exportQueue.blocked, 1);
});

test("builds target-specific ready export packages", () => {
  const pkg = buildExportPackage(institution.projects[0], "zenodo");

  assert.equal(pkg.ready, true);
  assert.equal(pkg.target, "Zenodo");
  assert.equal(pkg.files.every((file) => file.available), true);
  assert.equal(pkg.packageHash.length, 64);
});

test("blocks packages with missing evidence or low reproducibility", () => {
  const pkg = buildExportPackage(institution.projects[1], "pubmedCentral");

  assert.equal(pkg.ready, false);
  assert.equal(pkg.compliance.reproducibilityScore, 66);
});

test("builds compliance manifest and webhook events", () => {
  const manifest = buildComplianceManifest(institution);
  const events = buildWebhookEvents(institution);

  assert.equal(manifest.summary.total, 4);
  assert.equal(manifest.summary.ready, 3);
  assert.equal(events.length, 4);
  assert.equal(events[0].id.startsWith("evt_"), true);
});

test("exposes API catalog, export targets, and plugins", () => {
  assert.equal(listApiCatalog().length, 5);
  assert.equal(listExportTargets().length, 3);
  assert.equal(listFormattingPlugins().some((plugin) => plugin.key === "jats-lite"), true);
});

test("demo and API surfaces are reviewer-ready", () => {
  const report = buildDemoReport();
  const apiPackage = handleEnterpriseRequest("package", {
    projectId: "proj-climate-models",
    target: "funderReport"
  });

  assert.equal(report.dashboard.projectCount, 3);
  assert.equal(report.webhooks.length, 4);
  assert.equal(apiPackage.target, "Funder Reporting Portal");
});
