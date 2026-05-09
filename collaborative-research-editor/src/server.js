import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { CollaborationSession, createDocument } from "./editor-core.js";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "public");
const session = new CollaborationSession(
  createDocument({
    title: "CRISPR Delivery Literature Review",
    authors: ["Ada Lovelace", "Rosalind Franklin"],
  }),
);

session.applyOperation({
  type: "comment",
  blockId: session.document.blocks[0].id,
  author: "Rosalind Franklin",
  body: "Add inclusion criteria before sharing this draft.",
});
session.applyOperation({
  type: "task",
  blockId: session.document.blocks[2].id,
  assignee: "Ada Lovelace",
  title: "Attach reproducibility output from notebook execution",
});

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === "/api/document") {
      return sendJson(response, {
        document: session.document,
        outline: session.renderPublicationOutline(),
        manifest: session.exportManifest(),
      });
    }

    if (request.url === "/api/operation" && request.method === "POST") {
      const body = await readBody(request);
      const document = session.applyOperation(JSON.parse(body));
      return sendJson(response, {
        document,
        manifest: session.exportManifest(),
      });
    }

    const safePath = normalize(request.url === "/" ? "/index.html" : request.url).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const content = await readFile(filePath);
    response.writeHead(200, { "content-type": mime[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 500, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

const port = Number(process.env.PORT || 4127);
server.listen(port, () => {
  console.log(`Collaborative research editor running at http://localhost:${port}`);
});

function sendJson(response, payload) {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
