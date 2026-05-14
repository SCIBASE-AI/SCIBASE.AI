import http from "node:http";
import { artifactWorkspace } from "./sample-data.js";
import {
  buildExportDecisions,
  buildGovernancePacket,
  buildRetentionPolicy,
  buildStorageManifest,
  evaluateAccessGates,
  evaluateComputeTriggers,
  evaluateEnvironmentReadiness,
  summarizeVersionDiffs,
} from "./artifact-governance.js";

const port = Number(process.env.PORT || 4369);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

export function createServer(workspace = artifactWorkspace) {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, module: "artifact-run-governance" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/manifest") {
        sendJson(res, 200, buildStorageManifest(workspace));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/access-gates") {
        sendJson(res, 200, evaluateAccessGates(workspace));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/version-diffs") {
        sendJson(res, 200, summarizeVersionDiffs(workspace));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/environment") {
        sendJson(res, 200, evaluateEnvironmentReadiness(workspace));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/compute-triggers") {
        sendJson(res, 200, evaluateComputeTriggers(workspace));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/exports") {
        sendJson(res, 200, buildExportDecisions(workspace));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/retention") {
        sendJson(res, 200, buildRetentionPolicy(workspace));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/governance-packet") {
        sendJson(res, 200, buildGovernancePacket(workspace));
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
    console.log(`Artifact run governance API listening on http://localhost:${port}`);
  });
}
