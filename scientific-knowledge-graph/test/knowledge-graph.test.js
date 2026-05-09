import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboard, buildEntityPage, buildGraph, extractEntities, queryGraph, recommendResearch } from "../src/knowledge-graph.js";

test("extracts scientific entities from research objects", () => {
  const entities = extractEntities();

  assert.ok(entities.some((entity) => entity.type === "concept" && entity.label === "CRISPR"));
  assert.ok(entities.some((entity) => entity.type === "ontology" && entity.label === "UniProt"));
  assert.ok(entities.some((entity) => entity.type === "doi"));
});

test("builds graph nodes, edges, and schema metadata", () => {
  const graph = buildGraph();

  assert.ok(graph.nodes.some((node) => node.id === "paper-organoid-response"));
  assert.ok(graph.edges.some((edge) => edge.relationship === "mentions"));
  assert.ok(graph.schemaOrg.every((item) => item["@context"] === "https://schema.org"));
});

test("supports graph navigation queries and entity pages", () => {
  const graph = buildGraph();
  const query = queryGraph("CRISPR", { institution: "Neuroscience Methods Hub" }, graph);
  const entityPage = buildEntityPage("concept-crispr", graph);

  assert.ok(query.nodes.some((node) => node.institution === "Neuroscience Methods Hub"));
  assert.equal(entityPage.entity.label, "CRISPR");
  assert.ok(entityPage.usageContexts.length >= 2);
});

test("generates recommendations and dashboard payload", () => {
  const recommendations = recommendResearch();
  const dashboard = buildDashboard();

  assert.ok(recommendations.length >= 3);
  assert.ok(recommendations[0].score >= recommendations.at(-1).score);
  assert.ok(dashboard.navigation.reusedNotebook.nodes.some((node) => node.type === "notebook"));
});
