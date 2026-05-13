import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDashboard,
  buildPeerReviewReport,
  buildReproducibilityCheck,
  findResearchGaps,
} from "./assistant.js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "public");
const port = Number(process.env.PORT ?? 4316);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};

function json(res, payload) {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

async function staticFile(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(publicDir, safePath.replace(/^\/+/, ""));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": contentTypes[extname(filePath)] ?? "text/plain" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/dashboard") return json(res, buildDashboard());
  if (url.pathname === "/api/review") return json(res, buildPeerReviewReport());
  if (url.pathname === "/api/reproducibility") return json(res, buildReproducibilityCheck());
  if (url.pathname === "/api/gaps") return json(res, findResearchGaps());

  return staticFile(res, url.pathname);
});

server.listen(port, () => {
  console.log(`AI Research Copilot Suite running at http://localhost:${port}`);
});
