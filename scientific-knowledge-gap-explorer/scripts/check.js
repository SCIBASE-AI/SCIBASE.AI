"use strict";

const projects = require("../data/sample-projects.json");
const { buildKnowledgeGraph, findKnowledgeGaps } = require("../src/knowledge-gap-explorer");

const graph = buildKnowledgeGraph(projects);
const gaps = findKnowledgeGaps(graph, { minEvidence: 2, limit: 6 });

const requiredTypes = ["concept", "method", "dataset", "author", "institution", "domain"];
for (const type of requiredTypes) {
  if (!graph.nodes.some((node) => node.type === type)) {
    throw new Error(`Missing ${type} nodes`);
  }
}

if (gaps.length < 4) {
  throw new Error(`Expected at least four knowledge gap candidates, found ${gaps.length}`);
}

for (const gap of gaps) {
  if (!gap.supportingProjectIds.length) {
    throw new Error(`Gap ${gap.id} is missing supporting projects`);
  }
  if (!gap.explanation.every((line) => typeof line === "string" && line.length > 15)) {
    throw new Error(`Gap ${gap.id} has weak explanations`);
  }
  const direct = graph.projects.some((project) =>
    project.concepts.includes(gap.concept.label) &&
    project.methods.includes(gap.method.label) &&
    project.datasets.includes(gap.dataset.label)
  );
  if (direct) {
    throw new Error(`Gap ${gap.id} already exists as a direct project triple`);
  }
}

console.log(`check passed: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${gaps.length} ranked gaps`);
