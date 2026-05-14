import http from "node:http";
import { sampleRepository } from "./sample-data.js";
import {
  buildComponentManifest,
  buildExportBundle,
  buildReviewPacket,
  buildRollbackPlan,
  compareRepositoryVersions,
} from "./diff-review.js";

const port = Number(process.env.PORT || 4365);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

export function createServer(repository = sampleRepository) {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, module: "structured-repository-diff-review" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/manifest") {
        sendJson(res, 200, buildComponentManifest(repository));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/diff") {
        sendJson(res, 200, compareRepositoryVersions(repository));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/review") {
        sendJson(res, 200, buildReviewPacket(repository));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/rollback") {
        sendJson(res, 200, buildRollbackPlan(repository));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/export") {
        sendJson(res, 200, buildExportBundle(repository));
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer().listen(port, () => {
    console.log(`Structured repository diff review API listening on http://localhost:${port}`);
  });
}
