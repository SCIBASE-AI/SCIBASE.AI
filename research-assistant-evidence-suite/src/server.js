import http from "node:http";
import { buildAssistantDashboard, buildPeerReviewReport, buildReproducibilityReport, findResearchGaps } from "./assistant.js";
import { researcherProfile, sampleCorpus, sampleProject } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4316", 10);

function json(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function page() {
  const dashboard = buildAssistantDashboard(sampleProject, sampleCorpus, researcherProfile);
  const cards = [
    ["Readiness", dashboard.readinessScore],
    ["Peer Review", dashboard.summary.peerReviewScore],
    ["Reproducibility", dashboard.summary.reproducibilityConfidence],
    ["Top Gap", dashboard.summary.topGapScore]
  ]
    .map(([label, value]) => `<section class="card"><span>${label}</span><strong>${value}</strong></section>`)
    .join("");

  const findings = dashboard.review.findings
    .map((item) => `<li><b>${item.category}</b>: ${item.message}<br><small>${item.action}</small></li>`)
    .join("");

  const gaps = dashboard.researchGaps
    .slice(0, 3)
    .map((item) => `<li><b>${item.opportunityScore}</b> ${item.title}<br><small>${item.recommendedNextStep}</small></li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Research Assistant Evidence Suite</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f7f8fa; color: #18202a; }
    main { max-width: 1080px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 42px; margin: 8px 0 10px; letter-spacing: 0; }
    p { color: #536172; font-size: 18px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 28px 0; }
    .card, .panel { background: #fff; border: 1px solid #dfe4ec; border-radius: 8px; padding: 18px; }
    .card span { display: block; color: #647286; font-size: 14px; }
    .card strong { display: block; font-size: 34px; margin-top: 8px; }
    .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    li { margin: 0 0 14px; line-height: 1.4; }
    small { color: #657488; }
    code { background: #edf1f6; padding: 2px 6px; border-radius: 5px; }
    @media (max-width: 760px) { .grid, .panels { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <main>
    <p>SCIBASE.AI</p>
    <h1>Research Assistant Evidence Suite</h1>
    <p>${dashboard.project.title}. API endpoints: <code>/api/dashboard</code>, <code>/api/review</code>, <code>/api/reproducibility</code>, <code>/api/gaps</code>.</p>
    <div class="grid">${cards}</div>
    <div class="panels">
      <section class="panel"><h2>Peer Review Findings</h2><ul>${findings}</ul></section>
      <section class="panel"><h2>Research Gap Feed</h2><ul>${gaps}</ul></section>
    </div>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/dashboard") {
    return json(response, buildAssistantDashboard(sampleProject, sampleCorpus, researcherProfile));
  }
  if (url.pathname === "/api/review") {
    return json(response, buildPeerReviewReport(sampleProject));
  }
  if (url.pathname === "/api/reproducibility") {
    return json(response, buildReproducibilityReport(sampleProject));
  }
  if (url.pathname === "/api/gaps") {
    return json(response, findResearchGaps(sampleProject, sampleCorpus, researcherProfile));
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(page());
});

server.listen(port, () => {
  console.log(`Research Assistant Evidence Suite running at http://localhost:${port}`);
});
