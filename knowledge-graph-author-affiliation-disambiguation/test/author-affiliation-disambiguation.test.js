const assert = require("assert/strict");
const test = require("node:test");
const mentions = require("../data/sample-mentions.json");
const {
  compareMentions,
  createAuthorGraph,
  normalizeAffiliation,
  normalizeName,
  toSchemaOrg
} = require("../src/author-affiliation-disambiguation");

test("normalizes author names and affiliation aliases", () => {
  assert.deepEqual(normalizeName("Dr. Maya A. Chen").tokens, ["maya", "a", "chen"]);
  assert.ok(normalizeAffiliation("Dept. of Bioengineering, Stanford Univ.").includes("university"));
});

test("matches same author mentions with strong evidence", () => {
  const result = compareMentions(mentions[0], mentions[1]);
  assert.equal(result.decision, "same-author");
  assert.ok(result.score >= 0.72);
});

test("sends homonyms to curator review instead of merging", () => {
  const result = compareMentions(mentions[0], mentions[3]);
  assert.equal(result.decision, "homonym-review");
  assert.ok(result.score < 0.72);
});

test("builds author nodes, collaboration edges, and recommendation guards", () => {
  const graph = createAuthorGraph(mentions);
  assert.equal(graph.authorNodes.length, 3);
  assert.equal(graph.collaborationEdges.length, 1);
  assert.equal(graph.curatorQueue.length, 1);
  assert.equal(graph.recommendationGuards[0].reason, "author-identity-uncertain");
});

test("exports schema.org-compatible creator metadata", () => {
  const graph = createAuthorGraph(mentions);
  const schema = toSchemaOrg(graph);
  assert.equal(schema["@context"], "https://schema.org");
  assert.equal(schema.creator.length, graph.authorNodes.length);
});
