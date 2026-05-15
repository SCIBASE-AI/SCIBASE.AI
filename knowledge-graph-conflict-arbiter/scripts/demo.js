"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { arbitrateKnowledgeGraph } = require("../src/conflict-arbiter");

const graph = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/sample-graph.json"), "utf8"));
const packet = arbitrateKnowledgeGraph(graph, { asOfDate: "2026-05-15" });

console.log("Graph: " + packet.graphId);
console.log("Relationship groups: " + packet.summary.relationshipGroups);
console.log("Conflicts: " + packet.summary.conflicts);
console.log("Quarantined relationships: " + packet.summary.quarantined);
console.log("Suppressed recommendations: " + packet.summary.suppressedRecommendations);
console.log("Curator actions: " + packet.summary.curatorActions);
console.log("First action: " + packet.actions[0].message);
console.log("Audit digest: " + packet.auditDigest);
