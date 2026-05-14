import http from "node:http";
import { buildDemoReport } from "./demo.js";

const server = http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "community-trust-ledger" }));
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

const port = Number.parseInt(process.env.PORT || "4220", 10);
server.listen(port, () => {
  console.log(`Community trust ledger API listening on http://localhost:${port}`);
});
