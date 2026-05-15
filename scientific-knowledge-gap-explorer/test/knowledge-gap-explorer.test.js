"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const projects = require("../data/sample-projects.json");
const {
  buildEntityPage,
  buildKnowledgeGraph,
  buildRecommendationDigest,
  findKnowledgeGaps,
  queryGraph
} = require("../src/knowledge-gap-explorer");

describe("scientific knowledge gap explorer", () => {
  it("builds typed graph nodes and weighted co-occurrence edges", () => {
    const graph = buildKnowledgeGraph(projects);
    const concept = graph.nodes.find((node) => node.id === "concept:kinase-inhibition");
    const method = graph.nodes.find((node) => node.id === "method:single-cell-rna-seq");
    const edge = graph.edges.find((candidate) => {
      const ids = [candidate.sourceId, candidate.targetId];
      return ids.includes(concept.id) && ids.includes(method.id);
    });

    assert.equal(graph.projects.length, projects.length);
    assert.equal(concept.type, "concept");
    assert.equal(method.type, "method");
    assert.equal(edge.relation, "co-occurs-in-project");
    assert.deepEqual(edge.projectIds, ["proj-rna-drug-repurposing"]);
  });

  it("ranks underconnected intersections without recommending already-direct triples", () => {
    const graph = buildKnowledgeGraph(projects);
    const gaps = findKnowledgeGaps(graph, { minEvidence: 2, limit: 10 });
    const directTriple = gaps.find((gap) =>
      gap.concept.label === "kinase inhibition" &&
      gap.method.label === "single-cell RNA-seq" &&
      gap.dataset.label === "Perturb-seq Kinase Panel"
    );

    assert.ok(gaps.length > 0);
    assert.equal(directTriple, undefined);
    assert.ok(gaps[0].score >= gaps[gaps.length - 1].score);
    assert.ok(gaps[0].explanation.some((line) => line.includes("project")));
  });

  it("uses shared citation threads as explainable recommendation evidence", () => {
    const graph = buildKnowledgeGraph(projects);
    const gaps = findKnowledgeGaps(graph, { minEvidence: 2, limit: 20 });
    const singleCellGap = gaps.find((gap) =>
      gap.concept.label === "CRISPR screening" &&
      gap.method.label === "single-cell RNA-seq" &&
      gap.dataset.label === "Perturb-seq Kinase Panel"
    );

    assert.ok(singleCellGap);
    assert.ok(singleCellGap.sharedCitationDois.includes("10.1000/singlecell.2023.12"));
    assert.match(singleCellGap.suggestedAction, /Open a review workspace/);
  });

  it("personalizes digests while keeping evidence attached to every recommendation", () => {
    const graph = buildKnowledgeGraph(projects);
    const digest = buildRecommendationDigest(
      graph,
      { interests: ["CRISPR screening", "single-cell RNA-seq"] },
      { minEvidence: 2, limit: 4 }
    );

    assert.equal(digest.length, 4);
    assert.ok(digest[0].personalizedScore >= digest[digest.length - 1].personalizedScore);
    assert.ok(digest.every((item) => item.evidence.length >= 3));
    assert.ok(digest.some((item) => item.matchedInterests.length > 0));
  });

  it("renders entity pages and searchable graph results", () => {
    const graph = buildKnowledgeGraph(projects);
    const results = queryGraph(graph, { type: "dataset", keyword: "atlas" });
    const page = buildEntityPage(graph, results[0].id);

    assert.equal(results[0].label, "NeuroImmune Atlas");
    assert.equal(page.entity.type, "dataset");
    assert.ok(page.projects.some((project) => project.id === "proj-crispr-atlas"));
    assert.ok(page.relatedEntities.some((entity) => entity.label === "CRISPR screening"));
  });
});
