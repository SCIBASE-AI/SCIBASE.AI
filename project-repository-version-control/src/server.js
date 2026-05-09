import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCitation,
  buildDashboard,
  buildExportBundle,
  buildManifest,
  buildMergeRequestSummary,
  demoRepository,
  runReproducibilityCheck
} from "./repository-core.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const port = Number(process.env.PORT || 4129);
const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/dashboard") return json(response, buildDashboard());
    if (url.pathname.endsWith("/manifest")) return json(response, buildManifest());
    if (url.pathname.endsWith("/merge-request")) return json(response, buildMergeRequestSummary());
    if (url.pathname.endsWith("/reproducibility")) return json(response, runReproducibilityCheck());
    if (url.pathname.endsWith("/citation")) return json(response, { citation: buildCitation(demoRepository, url.searchParams.get("style") || "APA") });
    if (url.pathname.endsWith("/export")) return json(response, buildExportBundle());
    if (url.pathname === `/api/repositories/${demoRepository.id}`) return json(response, demoRepository);
    return await serveStatic(url.pathname === "/" ? "/index.html" : url.pathname, response);
  } catch (error) {
    response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, () => {
  console.log(`Project repository demo running at http://localhost:${port}`);
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
