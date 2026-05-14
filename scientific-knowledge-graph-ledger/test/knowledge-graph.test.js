import assert from "node:assert/strict";
import test from "node:test";
import { buildDemoReport } from "../src/demo.js";
import { documents } from "../src/sample-data.js";
import {
  buildEntityPage,
  buildGraph,
  exportJsonLd,
  extractEntities,
  recommendResearch,
  searchGraph
} from "../src/knowledge-graph.js";

test("extracts authors, tools, concepts, datasets, and references", () => {
  const entities = extractEntities(documents[0]);
  const ids = entities.map((entity) => entity.id);

  assert.equal(ids.includes("author:ada-rivera"), true);
  assert.equal(ids.includes("tool:jupyter"), true);
  assert.equal(ids.includes("dataset:dataset"), true);
  assert.equal(ids.includes("reference:10-1234-heat-health-2026"), true);
});

test("builds a graph with document and relationship evidence", () => {
  const graph = buildGraph(documents);

  assert.equal(graph.nodes.some((node) => node.id === "document:doc-heat-health"), true);
  assert.equal(graph.relationships.some((relationship) => relationship.type === "authored"), true);
  assert.equal(graph.relationships.some((relationship) => relationship.type === "applied_to"), true);
});

test("searches graph with filters", () => {
  const graph = buildGraph(documents);
  const results = searchGraph(graph, { query: "notebook", type: "document", minReproducibility: 80 });

  assert.equal(results.nodes.length, 2);
  assert.equal(results.nodes.every((node) => node.type === "document"), true);
});

test("builds entity pages and JSON-LD exports", () => {
  const graph = buildGraph(documents);
  const page = buildEntityPage(graph, "tool:jupyter");
  const jsonLd = exportJsonLd(graph);

  assert.equal(page.entity.label.toLowerCase(), "jupyter");
  assert.equal(page.inboundCount >= 1, true);
  assert.equal(jsonLd["@context"], "https://schema.org");
});

test("recommends research from interests and graph metrics", () => {
  const graph = buildGraph(documents);
  const recommendations = recommendResearch(graph, {
    userInterests: ["reproducibility", "notebook"],
    recentDocumentIds: ["doc-heat-health"]
  });

  assert.equal(recommendations[0].documentId, "document:doc-repro-tools");
  assert.equal(recommendations[0].reasons.includes("high_reproducibility"), true);
});

test("demo report exposes all reviewer surfaces", () => {
  const report = buildDemoReport();

  assert.equal(report.graphSummary.nodeCount > 0, true);
  assert.equal(report.search.nodes.length, 2);
  assert.equal(report.recommendations.length, 2);
});
