import http from "node:http";
import { graphSnapshot } from "./sample-data.js";
import {
  auditReferences,
  auditRelationships,
  buildGraphAuditPacket,
  buildJsonLdExport,
  buildNormalizedEntities,
  buildRecommendationProvenance,
  buildRemediationQueue,
  explainGraphQuery,
  suggestEntityMerges,
} from "./link-audit.js";

const port = Number(process.env.PORT || 4367);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

export function createServer(snapshot = graphSnapshot) {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, module: "knowledge-graph-link-audit" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/entities") {
        sendJson(res, 200, buildNormalizedEntities(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/merges") {
        sendJson(res, 200, suggestEntityMerges(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/relationships") {
        sendJson(res, 200, auditRelationships(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/references") {
        sendJson(res, 200, auditReferences(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/query-explanation") {
        sendJson(res, 200, explainGraphQuery(snapshot, url.searchParams.get("id")));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/recommendations") {
        sendJson(res, 200, buildRecommendationProvenance(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/remediation-queue") {
        sendJson(res, 200, buildRemediationQueue(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/jsonld") {
        sendJson(res, 200, buildJsonLdExport(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/audit-packet") {
        sendJson(res, 200, buildGraphAuditPacket(snapshot));
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
    console.log(`Knowledge graph link audit API listening on http://localhost:${port}`);
  });
}
