import http from "node:http";
import {
  appendAuditEvent,
  buildGovernanceDashboard,
  buildProjectSpace,
  buildResearcherProfile,
  createInvitation,
  evaluateAccess
} from "./governance.js";
import { sampleAuditLog, sampleInvitation, sampleProject, sampleUser } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4322", 10);
const auditLog = appendAuditEvent(sampleAuditLog, {
  actorId: sampleUser.id,
  action: "object.download.requested",
  target: "dataset-raw",
  metadata: { reason: "review reproducibility" }
});

function json(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function page() {
  const dashboard = buildGovernanceDashboard({
    user: sampleUser,
    project: sampleProject,
    invitation: sampleInvitation,
    auditLog
  });
  const access = dashboard.accessChecks
    .map((check) => `<li>${check.allowed ? "ALLOW" : "DENY"} ${check.action} ${check.objectId} (${check.reason})</li>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Identity Workspace Governance</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f7f8fb; color: #18202a; }
    main { max-width: 1060px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 42px; margin: 0 0 12px; letter-spacing: 0; }
    p { color: #536172; font-size: 18px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 28px 0; }
    .panel { background: white; border: 1px solid #dfe4ec; border-radius: 8px; padding: 18px; }
    strong { display: block; font-size: 30px; margin-top: 8px; }
    li { margin-bottom: 10px; }
    code { background: #edf1f6; padding: 2px 6px; border-radius: 5px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <main>
    <p>SCIBASE.AI governance milestone</p>
    <h1>Identity Workspace Governance</h1>
    <p>${sampleProject.title}. Endpoints: <code>/api/profile</code>, <code>/api/project</code>, <code>/api/access</code>, <code>/api/invitations</code>, <code>/api/audit</code>.</p>
    <section class="grid">
      <div class="panel">Assurance<strong>${dashboard.identity.assuranceLevel}</strong></div>
      <div class="panel">Reputation<strong>${dashboard.summary.reputationScore}</strong></div>
      <div class="panel">Audit events<strong>${dashboard.summary.auditEvents}</strong></div>
    </section>
    <section class="panel"><h2>Access Matrix</h2><ul>${access}</ul></section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/profile") return json(response, buildResearcherProfile(sampleUser));
  if (url.pathname === "/api/project") return json(response, buildProjectSpace(sampleProject));
  if (url.pathname === "/api/access") {
    return json(response, {
      manuscriptRead: evaluateAccess({ project: sampleProject, user: sampleUser, objectId: "doc-manuscript", action: "read" }),
      rawDataDownload: evaluateAccess({ project: sampleProject, user: sampleUser, objectId: "dataset-raw", action: "download" })
    });
  }
  if (url.pathname === "/api/invitations") return json(response, createInvitation(sampleInvitation));
  if (url.pathname === "/api/audit") return json(response, auditLog);
  if (url.pathname === "/api/dashboard") {
    return json(response, buildGovernanceDashboard({ user: sampleUser, project: sampleProject, invitation: sampleInvitation, auditLog }));
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(page());
});

server.listen(port, () => {
  console.log(`Identity Workspace Governance running at http://localhost:${port}`);
});
