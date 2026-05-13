import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createKnowledgeGraph,
  loadSampleCorpus,
  queryGraph,
  recommendResearch
} from "./knowledge-graph.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicRoot = join(root, "public");
const graph = createKnowledgeGraph(loadSampleCorpus());

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  try {
    if (url.pathname === "/api/dashboard") {
      return json(response, {
        stats: graph.stats,
        topEntities: graph.nodes.filter((node) => node.source === "extracted-entity").slice(0, 12),
        recommendations: recommendResearch(graph)
      });
    }

    if (url.pathname === "/api/graph") return json(response, graph);

    if (url.pathname === "/api/query") {
      return json(response, queryGraph(graph, {
        q: url.searchParams.get("q") ?? "",
        type: url.searchParams.get("type") || undefined,
        domain: url.searchParams.get("domain") || undefined,
        minReproducibility: Number(url.searchParams.get("minReproducibility") ?? 0),
        seedEntityId: url.searchParams.get("seedEntityId") || undefined
      }));
    }

    if (url.pathname.startsWith("/api/entities/")) {
      const id = decodeURIComponent(url.pathname.replace("/api/entities/", ""));
      const page = graph.entityPages[id];
      if (!page) return json(response, { error: "entity_not_found", id }, 404);
      return json(response, page);
    }

    if (url.pathname === "/api/recommendations") return json(response, recommendResearch(graph));

    const filePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const body = await readFile(join(publicRoot, filePath));
    response.writeHead(200, { "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream" });
    response.end(body);
  } catch (error) {
    json(response, { error: "not_found", message: error.message }, 404);
  }
});

const port = Number(process.env.PORT ?? 4177);
server.listen(port, () => {
  console.log(`Scientific knowledge graph demo running at http://localhost:${port}`);
});

function json(response, value, status = 200) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value, null, 2));
}
