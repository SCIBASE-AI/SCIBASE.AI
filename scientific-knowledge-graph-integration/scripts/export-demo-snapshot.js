import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  createKnowledgeGraph,
  loadSampleCorpus,
  queryGraph,
  recommendResearch
} from "../src/knowledge-graph.js";

const graph = createKnowledgeGraph(loadSampleCorpus());
const snapshot = {
  generatedAt: graph.generatedAt,
  stats: graph.stats,
  crisprQuery: queryGraph(graph, { q: "CRISPR", minReproducibility: 0.85 }),
  crisprEntityPage: graph.entityPages["concept-crispr"],
  recommendations: recommendResearch(graph),
  schemaOrgPreview: graph.schemaOrg["@graph"].slice(0, 6)
};

const outFile = join("docs", "demo", "dashboard-snapshot.json");
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
