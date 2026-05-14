import http from "node:http";
import { buildDemoReport } from "./demo.js";

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "collaborative-editor-operation-ledger" }));
    return;
  }

  if (request.url === "/demo-report") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(buildDemoReport(), null, 2));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

const port = Number.parseInt(process.env.PORT || "4240", 10);
server.listen(port, () => {
  console.log(`Collaborative editor operation ledger API listening on http://localhost:${port}`);
});
