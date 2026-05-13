import http from "node:http";
import {
  applyOperationBatch,
  buildEditorSession,
  createSnapshot,
  exportPublicationOutline,
  transitionTask
} from "./editor.js";
import { sampleDocument, sampleOperations, samplePresence } from "./sample-data.js";

const port = Number.parseInt(process.env.PORT ?? "4320", 10);
const editedDocument = applyOperationBatch(sampleDocument, sampleOperations);
const { document: versionedDocument } = createSnapshot(editedDocument, "Manuscript v1 Draft", false);
const taskDocument = transitionTask(versionedDocument, "t-1", "in-progress");

function json(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function page() {
  const session = buildEditorSession(taskDocument, samplePresence);
  const blocks = taskDocument.blocks
    .map((block) => `<li><b>${block.type}</b> ${block.section}: ${(block.content ?? block.source ?? "").slice(0, 90)}</li>`)
    .join("");
  const cursors = session.presence.cursors
    .map((cursor) => `<li>${cursor.name}: ${cursor.status} in ${cursor.blockId}</li>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Collaborative Research Editor Ops</title>
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
    <p>SCIBASE.AI collaboration milestone</p>
    <h1>Collaborative Research Editor Ops</h1>
    <p>${taskDocument.title}. Endpoints: <code>/api/document</code>, <code>/api/session</code>, <code>/api/versions</code>, <code>/api/tasks</code>, <code>/api/export</code>.</p>
    <section class="grid">
      <div class="panel">Revision<strong>${session.revision}</strong></div>
      <div class="panel">Active users<strong>${session.presence.activeUsers}</strong></div>
      <div class="panel">Open tasks<strong>${session.openTasks}</strong></div>
    </section>
    <section class="grid">
      <div class="panel"><h2>Blocks</h2><ul>${blocks}</ul></div>
      <div class="panel"><h2>Presence</h2><ul>${cursors}</ul></div>
      <div class="panel"><h2>Locks</h2><p>${taskDocument.locks.map((lock) => `${lock.section}: ${lock.reason}`).join("<br>")}</p></div>
    </section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/api/document") return json(response, taskDocument);
  if (url.pathname === "/api/session") return json(response, buildEditorSession(taskDocument, samplePresence));
  if (url.pathname === "/api/versions") return json(response, taskDocument.versions);
  if (url.pathname === "/api/tasks") return json(response, taskDocument.tasks);
  if (url.pathname === "/api/export") return json(response, exportPublicationOutline(taskDocument));
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(page());
});

server.listen(port, () => {
  console.log(`Collaborative Research Editor Ops running at http://localhost:${port}`);
});
