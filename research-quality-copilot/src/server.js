import http from "node:http";
import {
  createDashboard,
  createPaperSummary,
  createPeerReview,
  recommendCitations,
  runResearchWorkflow
} from "./research-tools.js";
import { citationLibrary, sampleProject } from "./sample-data.js";

const routes = {
  "/api/summary": () => createPaperSummary(sampleProject, { mode: "executive" }),
  "/api/review": () => createPeerReview(sampleProject),
  "/api/citations": () => recommendCitations(sampleProject, citationLibrary),
  "/api/workflow": () => runResearchWorkflow(sampleProject, citationLibrary),
  "/api/dashboard": () => createDashboard(sampleProject, citationLibrary)
};

const server = http.createServer((request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  const handler = routes[path];

  if (!handler) {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found", routes: Object.keys(routes) }, null, 2));
    return;
  }

  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(handler(), null, 2));
});

const port = Number.parseInt(process.env.PORT ?? "4321", 10);
server.listen(port, () => {
  console.log(`Research quality copilot listening on http://localhost:${port}`);
});
