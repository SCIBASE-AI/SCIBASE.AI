"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildReplicationSignalGraph,
  createEntityPage,
  queryGraph,
  renderGraphSvg
} = require("./index");
const sampleData = require("./sample-data");

const outDir = __dirname;
const graph = buildReplicationSignalGraph(sampleData);
const suppressed = queryGraph(graph, { treatment: "suppress_recommendation" });
const cautious = queryGraph(graph, { treatment: "show_with_replication_caution" });
const betaEntityPage = createEntityPage(graph, "claim:beta-organoid-rescue");

const output = {
  summary: graph.stats,
  suppressedRecommendations: suppressed.results,
  cautionRecommendations: cautious.results,
  exampleEntityPage: betaEntityPage,
  recommendationDigest: graph.recommendationDigest,
  publicationBiasAlerts: graph.publicationBiasAlerts
};

fs.writeFileSync(path.join(outDir, "demo-output.json"), `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "demo.svg"), renderGraphSvg(graph));

console.log(JSON.stringify(output, null, 2));
