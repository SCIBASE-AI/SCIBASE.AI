import {
  buildAdminDashboard,
  buildComplianceManifest,
  buildExportPackage,
  buildWebhookEvents,
  listApiCatalog,
  listExportTargets,
  listFormattingPlugins
} from "./export-operations.js";
import { institution } from "./sample-data.js";

export function buildDemoReport() {
  return {
    dashboard: buildAdminDashboard(institution),
    targets: listExportTargets(),
    package: buildExportPackage(institution.projects[0], "zenodo"),
    compliance: buildComplianceManifest(institution),
    webhooks: buildWebhookEvents(institution),
    apiCatalog: listApiCatalog(),
    formattingPlugins: listFormattingPlugins()
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildDemoReport(), null, 2));
}
