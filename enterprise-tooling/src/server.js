import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAdminDashboard, buildEnterprisePayload, buildExportPipeline, buildRestApiCatalog, createWebhookEvent } from "./enterprise-core.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const port = Number(process.env.PORT || 4132);
const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/dashboard") return json(response, buildEnterprisePayload());
    if (url.pathname === "/api/enterprise/analytics") return json(response, buildAdminDashboard());
    if (url.pathname === "/api/enterprise/catalog") return json(response, buildRestApiCatalog());
    if (url.pathname === "/api/enterprise/webhook-preview") return json(response, createWebhookEvent("project.published", "proj-organoid"));
    if (url.pathname === "/api/enterprise/export-preview") return json(response, buildExportPipeline({ projectId: "proj-organoid", target: url.searchParams.get("target") || "Zenodo", format: url.searchParams.get("format") || "JATS" }));
    return await serveStatic(url.pathname === "/" ? "/index.html" : url.pathname, response);
  } catch (error) {
    response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, () => {
  console.log(`Enterprise tooling demo running at http://localhost:${port}`);
});

function json(response, body) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

async function serveStatic(pathname, response) {
  const filePath = resolve(root, pathname.replace(/^\/+/, ""));
  if (!filePath.startsWith(`${root}${sep}`)) {
    response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "content-type": contentTypes[extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    throw error;
  }
}
