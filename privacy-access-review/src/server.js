import { createServer } from "node:http";
import {
  buildAuditEvidence,
  buildDashboard,
  evaluateAccess,
  evaluateInvitationRisk
} from "./access-review.js";
import { reviewClock, sampleProject, sampleUsers } from "./sample-data.js";

const port = Number(process.env.PORT ?? 4357);

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname === "/" || url.pathname === "/api/dashboard") {
      jsonResponse(response, 200, buildDashboard({ project: sampleProject, users: sampleUsers, now: reviewClock }));
      return;
    }

    if (url.pathname === "/api/access") {
      jsonResponse(
        response,
        200,
        evaluateAccess({
          project: sampleProject,
          users: sampleUsers,
          userKey: url.searchParams.get("user") ?? "owner",
          objectKey: url.searchParams.get("object") ?? "manuscriptDraft",
          action: url.searchParams.get("action") ?? "read",
          now: reviewClock
        })
      );
      return;
    }

    if (url.pathname === "/api/invitation") {
      jsonResponse(
        response,
        200,
        evaluateInvitationRisk({
          project: sampleProject,
          users: sampleUsers,
          inviteKey: url.searchParams.get("invite") ?? "externalReviewInvite",
          now: reviewClock
        })
      );
      return;
    }

    if (url.pathname === "/api/audit") {
      jsonResponse(response, 200, buildAuditEvidence(sampleProject));
      return;
    }

    jsonResponse(response, 404, {
      error: "Not found",
      endpoints: ["/api/dashboard", "/api/access", "/api/invitation", "/api/audit"]
    });
  } catch (error) {
    jsonResponse(response, 400, { error: error.message });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(handleRequest).listen(port, () => {
    console.log(`Privacy access review API listening on http://localhost:${port}`);
  });
}

export { handleRequest };
