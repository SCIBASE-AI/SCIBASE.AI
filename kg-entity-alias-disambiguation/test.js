const assert = require("assert");
const { graphBatch } = require("./sample-data");
const { evaluateBatch } = require("./index");

const report = evaluateBatch(graphBatch);

assert.strictEqual(report.summary.total, 4);
assert.strictEqual(report.summary["publish-canonical-node"], 2);
assert.strictEqual(report.summary["hold-for-curation"], 2);

const apc = report.mentions.find((mention) => mention.mention === "APC");
assert.strictEqual(apc.canonicalCandidate, "NCBIGene:324");
assert(apc.actions.includes("publish proposed graph edge"));

const java = report.mentions.find((mention) => mention.mention === "Java");
assert.strictEqual(java.decision, "hold-for-curation");
assert(java.findings.some((finding) => finding.includes("candidate margin")));

const mercury = report.mentions.find((mention) => mention.mention === "Mercury");
assert(mercury.findings.some((finding) => finding.includes("multiple ontology edges")));

console.log("kg-entity-alias-disambiguation tests passed");
