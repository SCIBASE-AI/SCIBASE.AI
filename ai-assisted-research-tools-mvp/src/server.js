import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  composeResearchAssistantReport,
  loadCitationCorpus,
  loadSampleManuscript,
  recommendCitations,
  reviewManuscript,
  summarizePaper
} from "./research-tools.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicRoot = join(root, "public");
const manuscript = loadSampleManuscript();
const corpus = loadCitationCorpus();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  try {
    if (url.pathname === "/api/report") return json(response, composeResearchAssistantReport(manuscript));
    if (url.pathname === "/api/review") return json(response, reviewManuscript(manuscript));
    if (url.pathname === "/api/summary") return json(response, summarizePaper(manuscript, url.searchParams.get("mode") ?? "executive"));
    if (url.pathname === "/api/citations") {
      return json(response, recommendCitations(manuscript, corpus, { style: url.searchParams.get("style") ?? "apa" }));
    }

    const filePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const body = await readFile(join(publicRoot, filePath));
    response.writeHead(200, { "content-type": contentTypes[extname(filePath)] ?? "application/octet-stream" });
    response.end(body);
  } catch (error) {
    json(response, { error: "not_found", message: error.message }, 404);
  }
});

const port = Number(process.env.PORT ?? 4183);
server.listen(port, () => {
  console.log(`AI-assisted research tools demo running at http://localhost:${port}`);
});

function json(response, value, status = 200) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value, null, 2));
}
