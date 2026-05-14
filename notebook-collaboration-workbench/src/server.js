import http from "node:http";
import { sampleNotebook } from "./sample-data.js";
import {
  annotateCell,
  buildNotebookPackage,
  buildReviewDashboard,
  buildVersionManifest,
  cloneNotebook,
  planExecutionQueue,
  recordExecutionSnapshot,
  validateNotebook,
} from "./workbench.js";

const port = Number(process.env.PORT || 4362);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function createServer(notebook = sampleNotebook) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, module: "notebook-collaboration-workbench" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/notebook") {
        sendJson(res, 200, notebook);
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/validate") {
        sendJson(res, 200, validateNotebook(notebook));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/executions") {
        sendJson(res, 200, { executions: planExecutionQueue(notebook) });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/dashboard") {
        sendJson(res, 200, buildReviewDashboard(notebook));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/package") {
        sendJson(res, 200, buildNotebookPackage(notebook));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/version") {
        sendJson(res, 200, buildVersionManifest(notebook, "API export candidate"));
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/annotate") {
        const body = await readJson(req);
        const result = annotateCell(cloneNotebook(notebook), body);
        sendJson(res, 201, result.annotation);
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/execution-snapshot") {
        const body = await readJson(req);
        const result = recordExecutionSnapshot(cloneNotebook(notebook), body.executionId, body.result ?? {});
        sendJson(res, 201, result.snapshot);
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
    console.log(`Notebook collaboration workbench API listening on http://localhost:${port}`);
  });
}
