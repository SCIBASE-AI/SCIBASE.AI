import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDashboardPayload, buildMetadataBundle, buildStorageManifest, runExecutableEnvironment } from "./hosting-core.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const port = Number(process.env.PORT || 4133);
const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/dashboard") return json(response, buildDashboardPayload());
    if (url.pathname === "/api/storage/manifest") return json(response, buildStorageManifest());
    if (url.pathname === "/api/metadata") return json(response, buildMetadataBundle());
    if (url.pathname === "/api/execute") return json(response, runExecutableEnvironment({ environmentId: url.searchParams.get("environment") || "env-python" }));
    return await serveStatic(url.pathname === "/" ? "/index.html" : url.pathname, response);
  } catch (error) {
    response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, () => {
  console.log(`Scientific data/code hosting demo running at http://localhost:${port}`);
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
