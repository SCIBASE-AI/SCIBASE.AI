const mentions = require("../data/sample-mentions.json");
const {createAuthorGraph, toSchemaOrg} = require("../src/author-affiliation-disambiguation");

const graph = createAuthorGraph(mentions);

console.log("Author nodes");
console.table(graph.authorNodes.map((node) => ({
  id: node.id,
  name: node.name,
  mentions: node.mentionIds.length,
  documents: node.documents.length,
  concepts: node.concepts.length
})));

console.log("\nCollaboration edges");
console.table(graph.collaborationEdges);

console.log("\nCurator queue");
console.table(graph.curatorQueue);

console.log("\nRecommendation guards");
console.log(JSON.stringify(graph.recommendationGuards, null, 2));

console.log("\nSchema.org export");
console.log(JSON.stringify(toSchemaOrg(graph), null, 2));
