import http from "node:http";
import {
  buildEntityPage,
  buildGraphDashboard,
  buildJsonLdExport,
  buildKnowledgeGraph,
  buildRecommendations,
  searchGraph
} from "./graph.js";
import { sampleObjects, userProfile } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4330", 10);
const graph = buildKnowledgeGraph(sampleObjects);

function json(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function page() {
  const dashboard = buildGraphDashboard(sampleObjects, userProfile);
  const recommendations = dashboard.recommendations.map((item) => `<li>${item.label} (${item.type}) - ${item.reason}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Scientific Knowledge Graph</title>
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
    <p>SCIBASE.AI graph milestone</p>
    <h1>Scientific Knowledge Graph</h1>
    <p>Endpoints: <code>/api/entities</code>, <code>/api/relationships</code>, <code>/api/search</code>, <code>/api/recommendations</code>, <code>/api/jsonld</code>.</p>
    <section class="grid">
      <div class="panel">Nodes<strong>${dashboard.summary.nodes}</strong></div>
      <div class="panel">Edges<strong>${dashboard.summary.edges}</strong></div>
      <div class="panel">Types<strong>${dashboard.summary.nodeTypes.length}</strong></div>
    </section>
    <section class="panel"><h2>Recommendations</h2><ul>${recommendations}</ul></section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/entities") return json(response, graph.nodes);
  if (url.pathname === "/api/relationships") return json(response, graph.edges);
  if (url.pathname === "/api/search") return json(response, searchGraph(graph, { domain: "computational-biology", minReproducibility: 85 }));
  if (url.pathname === "/api/entity") return json(response, buildEntityPage(graph, "dataset:gse-organoid-42"));
  if (url.pathname === "/api/recommendations") return json(response, buildRecommendations(graph, userProfile));
  if (url.pathname === "/api/jsonld") return json(response, buildJsonLdExport(graph));
  if (url.pathname === "/api/dashboard") return json(response, buildGraphDashboard(sampleObjects, userProfile));
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(page());
});

server.listen(port, () => {
  console.log(`Scientific Knowledge Graph running at http://localhost:${port}`);
});
