import http from "node:http";
import { sampleChallenges, sampleParticipantApplications } from "./sample-data.js";
import {
  buildChallengeDashboard,
  buildPublishDecision,
  buildSponsorAuditPacket,
  scoreParticipantApplication,
  validateChallenge,
} from "./intake-gate.js";

const port = Number(process.env.PORT || 4364);

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body, null, 2));
}

function findChallenge(challenges, id) {
  const challenge = challenges.find((item) => item.id === id) ?? challenges[0];
  if (!challenge) {
    throw new Error("No sample challenge available");
  }
  return challenge;
}

export function createServer(challenges = sampleChallenges, applications = sampleParticipantApplications) {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, module: "bounty-intake-compliance-gate" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/dashboard") {
        sendJson(res, 200, buildChallengeDashboard(challenges, applications));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/validate") {
        const challenge = findChallenge(challenges, url.searchParams.get("id"));
        sendJson(res, 200, validateChallenge(challenge));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/publish-decision") {
        const challenge = findChallenge(challenges, url.searchParams.get("id"));
        sendJson(res, 200, buildPublishDecision(challenge));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/prequalification") {
        const challenge = findChallenge(challenges, url.searchParams.get("challenge"));
        const applicationId = url.searchParams.get("application") ?? applications[0]?.id;
        const application = applications.find((item) => item.id === applicationId);
        if (!application) {
          throw new Error(`Unknown application: ${applicationId}`);
        }
        sendJson(res, 200, scoreParticipantApplication(challenge, application));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/audit-packet") {
        const challenge = findChallenge(challenges, url.searchParams.get("id"));
        sendJson(res, 200, buildSponsorAuditPacket(challenge, applications));
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
    console.log(`Bounty intake compliance gate API listening on http://localhost:${port}`);
  });
}
