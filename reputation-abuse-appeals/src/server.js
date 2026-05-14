import http from "node:http";
import { communitySnapshot } from "./sample-data.js";
import {
  buildAbuseReport,
  buildAppealPacket,
  buildModeratorQueue,
  buildTransparencyReport,
  computeReputationAdjustments,
  evaluateBadgeQuarantine,
} from "./reputation-guardrails.js";

const port = Number(process.env.PORT || 4366);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

export function createServer(snapshot = communitySnapshot) {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, module: "reputation-abuse-appeals" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/abuse-report") {
        sendJson(res, 200, buildAbuseReport(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/adjustments") {
        sendJson(res, 200, computeReputationAdjustments(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/badges") {
        sendJson(res, 200, evaluateBadgeQuarantine(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/appeal") {
        sendJson(res, 200, buildAppealPacket(snapshot, url.searchParams.get("id")));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/moderator-queue") {
        sendJson(res, 200, buildModeratorQueue(snapshot));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/transparency") {
        sendJson(res, 200, buildTransparencyReport(snapshot));
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
    console.log(`Reputation abuse and appeals API listening on http://localhost:${port}`);
  });
}
