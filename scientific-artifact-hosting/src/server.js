import http from "node:http";
import {
  buildArtifactManifest,
  buildComputeTriggers,
  buildHostingDashboard,
  buildMetadataExports,
  buildRunPlan,
  buildTagIndex,
  diffArtifactVersions,
  evaluateFairCompliance
} from "./artifacts.js";
import { artifacts, repositoryMetadata, runtime, triggers } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4332", 10);

function json(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function page() {
  const dashboard = buildHostingDashboard({ metadata: repositoryMetadata, artifacts, runtime, triggers });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Scientific Artifact Hosting</title>
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
    <p>SCIBASE.AI artifact milestone</p>
    <h1>Scientific Artifact Hosting</h1>
    <p>${repositoryMetadata.title}. Endpoints: <code>/api/manifest</code>, <code>/api/metadata</code>, <code>/api/fair</code>, <code>/api/diff</code>, <code>/api/runtime</code>, <code>/api/triggers</code>.</p>
    <section class="grid">
      <div class="panel">Artifacts<strong>${dashboard.manifest.entries.length}</strong></div>
      <div class="panel">FAIR<strong>${dashboard.fair.score}</strong></div>
      <div class="panel">Triggers<strong>${dashboard.triggers.length}</strong></div>
      <div class="panel">Run<strong>${dashboard.runPlan.status}</strong></div>
    </section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/manifest") return json(response, buildArtifactManifest(artifacts));
  if (url.pathname === "/api/metadata") return json(response, buildMetadataExports(repositoryMetadata, artifacts));
  if (url.pathname === "/api/fair") return json(response, evaluateFairCompliance(repositoryMetadata, artifacts));
  if (url.pathname === "/api/diff") return json(response, diffArtifactVersions(artifacts[0], artifacts[1]));
  if (url.pathname === "/api/tags") return json(response, buildTagIndex(artifacts));
  if (url.pathname === "/api/runtime") return json(response, buildRunPlan(runtime, artifacts));
  if (url.pathname === "/api/triggers") return json(response, buildComputeTriggers(triggers, runtime));
  if (url.pathname === "/api/dashboard") return json(response, buildHostingDashboard({ metadata: repositoryMetadata, artifacts, runtime, triggers }));
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(page());
});

server.listen(port, () => {
  console.log(`Scientific Artifact Hosting running at http://localhost:${port}`);
});
