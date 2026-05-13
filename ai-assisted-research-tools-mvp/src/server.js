import http from "node:http";
import { samplePaper, researcherProfile } from "./sample-data.js";
import {
  buildCitationToolkit,
  buildPeerReviewAid,
  buildResearchToolsDashboard,
  buildToolRegistry,
  evaluateGuardrails,
  planAssistedWorkflow,
  summarizePaper
} from "./tools.js";

const routes = {
  "/api/registry": () => buildToolRegistry(),
  "/api/summary": () => summarizePaper(samplePaper),
  "/api/review": () => buildPeerReviewAid(samplePaper, { strictness: researcherProfile.reviewStrictness }),
  "/api/citations": () => buildCitationToolkit(samplePaper, researcherProfile.preferredStyles),
  "/api/workflow": () => planAssistedWorkflow(samplePaper, researcherProfile),
  "/api/guardrails": () => evaluateGuardrails(samplePaper),
  "/api/dashboard": () => buildResearchToolsDashboard(samplePaper, researcherProfile)
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const handler = routes[url.pathname];
  response.setHeader("content-type", "application/json; charset=utf-8");
  if (!handler) {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "not_found", routes: Object.keys(routes) }));
    return;
  }
  response.end(JSON.stringify(handler(), null, 2));
});

const port = Number(process.env.PORT ?? 4335);
server.listen(port, () => {
  console.log(`AI-assisted research tools MVP listening on http://localhost:${port}`);
});
