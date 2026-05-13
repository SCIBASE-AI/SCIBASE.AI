import http from "node:http";
import {
  buildCitationRecord,
  buildDiffPlan,
  buildMergeRequest,
  buildRepositoryExport,
  buildRepositoryManifest,
  buildReproducibilityReport,
  buildVersionGraph,
  createForkRecord
} from "./repository.js";
import { sampleRepository } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4328", 10);

function json(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function page() {
  const manifest = buildRepositoryManifest(sampleRepository);
  const versionGraph = buildVersionGraph(sampleRepository);
  const repro = buildReproducibilityReport(sampleRepository);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Scientific Repository Versioning</title>
  <style>
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f7f8fb; color: #18202a; }
    main { max-width: 1060px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 42px; margin: 0 0 12px; letter-spacing: 0; }
    p { color: #536172; font-size: 18px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 28px 0; }
    .panel { background: white; border: 1px solid #dfe4ec; border-radius: 8px; padding: 18px; }
    strong { display: block; font-size: 30px; margin-top: 8px; }
    code { background: #edf1f6; padding: 2px 6px; border-radius: 5px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <main>
    <p>SCIBASE.AI repository milestone</p>
    <h1>Scientific Repository Versioning</h1>
    <p>${sampleRepository.title}. Endpoints: <code>/api/manifest</code>, <code>/api/versioning</code>, <code>/api/merge-request</code>, <code>/api/reproducibility</code>, <code>/api/citation</code>, <code>/api/export</code>.</p>
    <section class="grid">
      <div class="panel">Components<strong>${manifest.components.length}</strong></div>
      <div class="panel">Commits<strong>${versionGraph.commits.length}</strong></div>
      <div class="panel">Branches<strong>${versionGraph.branches.length}</strong></div>
      <div class="panel">Repro<strong>${repro.status}</strong></div>
    </section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/manifest") return json(response, buildRepositoryManifest(sampleRepository));
  if (url.pathname === "/api/versioning") return json(response, buildVersionGraph(sampleRepository));
  if (url.pathname === "/api/fork") {
    return json(response, createForkRecord(sampleRepository, { forkId: "fork-qc-thresholds", ownerId: "user-mateo", reason: "Explore QC thresholds" }));
  }
  if (url.pathname === "/api/merge-request") return json(response, buildMergeRequest(sampleRepository, sampleRepository.mergeRequest));
  if (url.pathname === "/api/diff") return json(response, buildDiffPlan(sampleRepository));
  if (url.pathname === "/api/reproducibility") return json(response, buildReproducibilityReport(sampleRepository));
  if (url.pathname === "/api/citation") return json(response, buildCitationRecord(sampleRepository));
  if (url.pathname === "/api/export") return json(response, buildRepositoryExport(sampleRepository));
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(page());
});

server.listen(port, () => {
  console.log(`Scientific Repository Versioning running at http://localhost:${port}`);
});
