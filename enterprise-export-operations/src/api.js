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

export function handleEnterpriseRequest(route, payload = {}) {
  switch (route) {
    case "dashboard":
      return buildAdminDashboard(institution);
    case "targets":
      return listExportTargets();
    case "package": {
      const project = institution.projects.find((candidate) => candidate.id === payload.projectId);
      if (!project) throw new Error(`Unknown project: ${payload.projectId}`);
      return buildExportPackage(project, payload.target);
    }
    case "compliance":
      return buildComplianceManifest(institution);
    case "webhooks":
      return buildWebhookEvents(institution);
    case "plugins":
      return listFormattingPlugins();
    case "catalog":
      return listApiCatalog();
    default:
      throw new Error(`Unknown route: ${route}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [route = "catalog", projectId = "proj-climate-models", target = "zenodo"] = process.argv.slice(2);
  console.log(JSON.stringify(handleEnterpriseRequest(route, { projectId, target }), null, 2));
}
