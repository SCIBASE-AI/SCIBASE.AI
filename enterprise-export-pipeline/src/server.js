import { createServer } from "node:http";
import {
  buildComplianceEvidence,
  buildEnterpriseDashboard,
  buildExportPackage,
  listExportTargets
} from "./export-pipeline.js";
import { sampleInstitution, sampleProject } from "./sample-data.js";

const port = Number(process.env.PORT ?? 4349);

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const target = url.searchParams.get("target") ?? "institutional-repository";

  try {
    if (url.pathname === "/" || url.pathname === "/api/dashboard") {
      jsonResponse(response, 200, {
        institution: sampleInstitution,
        dashboard: buildEnterpriseDashboard(sampleProject)
      });
      return;
    }

    if (url.pathname === "/api/targets") {
      jsonResponse(response, 200, { targets: listExportTargets() });
      return;
    }

    if (url.pathname === "/api/export") {
      jsonResponse(response, 200, buildExportPackage(sampleProject, target));
      return;
    }

    if (url.pathname === "/api/compliance") {
      jsonResponse(response, 200, {
        target,
        evidence: buildComplianceEvidence(sampleProject, target)
      });
      return;
    }

    if (url.pathname === "/api/webhook") {
      const exportPackage = buildExportPackage(sampleProject, target);
      jsonResponse(response, 200, exportPackage.integrationEvent);
      return;
    }

    jsonResponse(response, 404, {
      error: "Not found",
      endpoints: ["/api/dashboard", "/api/targets", "/api/export?target=zenodo", "/api/compliance", "/api/webhook"]
    });
  } catch (error) {
    jsonResponse(response, 400, {
      error: error.message
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(handleRequest).listen(port, () => {
    console.log(`Enterprise export pipeline API listening on http://localhost:${port}`);
  });
}

export { handleRequest };
