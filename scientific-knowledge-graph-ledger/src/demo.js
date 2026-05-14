import {
  buildEntityPage,
  buildGraph,
  exportJsonLd,
  recommendResearch,
  searchGraph
} from "./knowledge-graph.js";
import { documents } from "./sample-data.js";

export function buildDemoReport() {
  const graph = buildGraph(documents);
  return {
    graphSummary: {
      nodeCount: graph.nodes.length,
      relationshipCount: graph.relationships.length
    },
    search: searchGraph(graph, {
      query: "notebook",
      type: "document",
      minReproducibility: 80
    }),
    entityPage: buildEntityPage(graph, "tool:jupyter"),
    jsonLd: exportJsonLd(graph),
    recommendations: recommendResearch(graph, {
      userInterests: ["heat", "notebook", "reproducibility"],
      recentDocumentIds: ["doc-heat-health"]
    })
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildDemoReport(), null, 2));
}
