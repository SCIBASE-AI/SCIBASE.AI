import test from "node:test";
import assert from "node:assert/strict";
import {
  createKnowledgeGraph,
  extractScientificEntities,
  loadSampleCorpus,
  queryGraph,
  recommendResearch
} from "../src/knowledge-graph.js";

test("extracts scientific entities from uploaded research content", () => {
  const [paper] = loadSampleCorpus();
  const entities = extractScientificEntities(paper);

  assert.ok(entities.concepts.includes("CRISPR"));
  assert.ok(entities.tools.includes("Jupyter"));
  assert.ok(entities.authors.includes("Maya Chen"));
  assert.ok(entities.dois.includes("10.1038/s41586-020-03145-6"));
  assert.ok(entities.ontologies.includes("UniProt:P04637"));
});

test("builds typed graph nodes, edges, entity pages, and schema.org metadata", () => {
  const graph = createKnowledgeGraph(loadSampleCorpus());

  assert.equal(graph.stats.byType.paper, 1);
  assert.ok(graph.stats.nodeCount > 25);
  assert.ok(graph.stats.edgeCount > 35);
  assert.equal(graph.entityPages["concept-crispr"].label, "CRISPR");
  assert.ok(graph.entityPages["concept-crispr"].citationReach >= 84);
  assert.equal(graph.schemaOrg["@context"], "https://schema.org");
});

test("queries graph by text, type, domain, and reproducibility filters", () => {
  const graph = createKnowledgeGraph(loadSampleCorpus());
  const result = queryGraph(graph, {
    q: "single-cell",
    type: "concept",
    domain: "biomedicine",
    minReproducibility: 0.9
  });

  assert.equal(result.nodes.length, 1);
  assert.equal(result.nodes[0].id, "concept-single-cell-rna-seq");
});

test("returns ranked recommendations for sidebar and digest payloads", () => {
  const graph = createKnowledgeGraph(loadSampleCorpus());
  const recommendations = recommendResearch(graph, {
    interests: ["CRISPR", "reproducibility"],
    recentEntityIds: ["concept-crispr"],
    limit: 3
  });

  assert.equal(recommendations.length, 3);
  assert.equal(recommendations[0].entityId, "concept-crispr");
  assert.ok(recommendations.every((item) => item.reason.length > 20));
});
