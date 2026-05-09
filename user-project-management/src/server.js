import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  authenticateIdentity,
  buildProjectDashboard,
  computeReputation,
  createProjectSpace,
  demoWorkspace,
  evaluateAccess,
  syncOrcidProfile
} from "./management-core.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const port = Number(process.env.PORT || 4130);
const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/dashboard") return json(response, buildProjectDashboard());
    if (url.pathname === "/api/auth/check") return json(response, authenticateIdentity({ provider: "ORCID", identifier: demoWorkspace.users[0].orcid, mfaCode: "123456" }));
    if (url.pathname.startsWith("/api/users/") && url.pathname.endsWith("/orcid")) return json(response, syncOrcidProfile(url.pathname.split("/")[3]));
    if (url.pathname.startsWith("/api/users/") && url.pathname.endsWith("/reputation")) return json(response, computeReputation(url.pathname.split("/")[3]));
    if (url.pathname === "/api/projects/create") return json(response, createProjectSpace({ title: "Prospective validation cohort", ownerId: "user-alice", tags: ["validation"] }).project);
    if (url.pathname === "/api/access/check") return json(response, evaluateAccess({ userId: "user-mateo", projectId: "project-organoid-response", action: "edit_code", objectType: "code" }));
    return await serveStatic(url.pathname === "/" ? "/index.html" : url.pathname, response);
  } catch (error) {
    response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, () => {
  console.log(`User project management demo running at http://localhost:${port}`);
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
