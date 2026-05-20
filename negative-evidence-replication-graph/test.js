"use strict";

const assert = require("node:assert/strict");
const {
  buildReplicationSignalGraph,
  createEntityPage,
  evidenceQuality,
  queryGraph,
  signalStrength
} = require("./index");
const sampleData = require("./sample-data");

const graph = buildReplicationSignalGraph(sampleData);

assert.equal(graph.stats.claimCount, 3);
assert.equal(graph.stats.replicationSignalCount, 4);
assert.ok(graph.stats.edgeCount >= 15);

const beta = graph.claimSummaries.find((summary) => summary.claimId === "claim:beta-organoid-rescue");
assert.equal(beta.treatment, "suppress_recommendation");
assert.ok(beta.negativePressure > 1);
assert.ok(beta.requiredActions.includes("open_curator_review"));
assert.ok(beta.requiredActions.includes("remove_from_ai_recommendation_digest"));

const alpha = graph.claimSummaries.find((summary) => summary.claimId === "claim:alpha-inflammatory-drop");
assert.equal(alpha.treatment, "promote_as_replicated");
assert.ok(alpha.positiveSupport > 0.7);

const graphene = graph.claimSummaries.find((summary) => summary.claimId === "claim:graphene-ultra-sensitive");
assert.equal(graphene.treatment, "show_with_replication_caution");
assert.ok(graphene.requiredActions.includes("request_method_detail_before_digesting"));

const betaSignal = sampleData.replicationReports.find((report) => report.id === "rep:beta-failed-media");
assert.ok(evidenceQuality(betaSignal) > 0.7);
assert.ok(signalStrength(betaSignal) < -0.7);

const cautious = queryGraph(graph, { treatment: "show_with_replication_caution" });
assert.equal(cautious.count, 1);
assert.equal(cautious.results[0].claimId, "claim:graphene-ultra-sensitive");

const neuroscience = queryGraph(graph, { domain: "neuroscience", minimumScore: 0.5 });
assert.equal(neuroscience.count, 1);
assert.equal(neuroscience.results[0].claimId, "claim:alpha-inflammatory-drop");

const entityPage = createEntityPage(graph, "claim:beta-organoid-rescue");
assert.equal(entityPage.type, "ScientificClaim");
assert.equal(entityPage.treatment, "suppress_recommendation");
assert.equal(entityPage.replicationSignals.length, 2);
assert.equal(entityPage.jsonLd["@context"], "https://schema.org");
assert.equal(entityPage.jsonLd.additionalProperty[0].value, "suppress_recommendation");

const signalEdges = graph.edges.filter((edge) => edge.type === "evaluates_claim");
assert.equal(signalEdges.length, 4);
assert.ok(signalEdges.every((edge) => typeof edge.evidence.quality === "number"));

console.log("negative-evidence-replication-graph tests passed");
