import http from "node:http";
import { sampleManuscript } from "./sample-data.js";
import {
  alignClaimsToEvidence,
  buildHallucinationGuardrail,
  buildPaperIntake,
  buildToolAuditPacket,
  generateSummary,
  recommendCitations,
  runPeerReviewAid,
} from "./research-tool-audit.js";

const port = Number(process.env.PORT || 4368);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

export function createServer(manuscript = sampleManuscript) {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, module: "ai-research-tool-audit-trail" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/intake") {
        sendJson(res, 200, buildPaperIntake(manuscript));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/summary") {
        sendJson(res, 200, generateSummary(manuscript, url.searchParams.get("mode") ?? "abstract"));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/claims") {
        sendJson(res, 200, alignClaimsToEvidence(manuscript));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/peer-review") {
        sendJson(res, 200, runPeerReviewAid(manuscript));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/citations") {
        sendJson(res, 200, recommendCitations(manuscript, url.searchParams.get("style") ?? "APA"));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/guardrail") {
        sendJson(res, 200, buildHallucinationGuardrail(manuscript));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/audit-packet") {
        sendJson(res, 200, buildToolAuditPacket(manuscript));
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
    console.log(`AI research tool audit API listening on http://localhost:${port}`);
  });
}
