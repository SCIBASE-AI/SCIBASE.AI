import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildEntityPage,
  buildGraphDashboard,
  buildJsonLdExport,
  buildKnowledgeGraph,
  buildRecommendations,
  extractEntities,
  searchGraph
} from "../src/graph.js";
import { sampleObjects, userProfile } from "../src/sample-data.js";

test("entity extraction finds scientific node types", () => {
  const entities = extractEntities(sampleObjects[0]);

  assert.ok(entities.some((entity) => entity.type === "concept" && entity.label === "CRISPR"));
  assert.ok(entities.some((entity) => entity.type === "author" && entity.label === "Alina Chen"));
  assert.ok(entities.some((entity) => entity.type === "doi"));
  assert.ok(entities.some((entity) => entity.type === "project"));
});

test("knowledge graph builds deduplicated nodes and evidence-backed edges", () => {
  const graph = buildKnowledgeGraph(sampleObjects);

  assert.ok(graph.nodes.length > sampleObjects.length);
  assert.ok(graph.edges.every((edge) => edge.evidence && edge.sourceObjectId));
  assert.equal(graph.nodes.filter((node) => node.id === "dataset:gse-organoid-42").length, 1);
});

test("graph search filters by domain and reproducibility", () => {
  const graph = buildKnowledgeGraph(sampleObjects);
  const results = searchGraph(graph, { domain: "computational-biology", minReproducibility: 85 });

  assert.ok(results.length > 0);
  assert.ok(results.every((node) => node.domain === "computational-biology"));
  assert.ok(results.every((node) => node.reproducibilityScore >= 85));
});

test("entity page aggregates contexts and connected evidence", () => {
  const graph = buildKnowledgeGraph(sampleObjects);
  const page = buildEntityPage(graph, "dataset:gse-organoid-42");

  assert.equal(page.entity.label, "GSE-ORGANOID-42");
  assert.ok(page.contexts.includes("paper-organoid-crispr"));
  assert.ok(page.evidence.some((item) => item.relation === "uses-dataset"));
});

test("recommendations are personalized and sorted", () => {
  const graph = buildKnowledgeGraph(sampleObjects);
  const recommendations = buildRecommendations(graph, userProfile);

  assert.ok(recommendations.length > 0);
  assert.ok(recommendations[0].score >= recommendations[1].score);
  assert.ok(recommendations.some((item) => item.surface === "project-sidebar"));
});

test("JSON-LD export uses schema.org graph payloads", () => {
  const graph = buildKnowledgeGraph(sampleObjects);
  const jsonLd = buildJsonLdExport(graph);

  assert.equal(jsonLd["@context"], "https://schema.org");
  assert.equal(jsonLd["@graph"].length, graph.nodes.length);
  assert.ok(jsonLd["@graph"].some((node) => node["@type"] === "Dataset"));
});

test("dashboard summarizes graph state", () => {
  const dashboard = buildGraphDashboard(sampleObjects, userProfile);

  assert.ok(dashboard.summary.nodes > 0);
  assert.ok(dashboard.summary.edges > 0);
  assert.ok(dashboard.summary.nodeTypes.includes("concept"));
  assert.ok(dashboard.recommendations.length <= 6);
});
