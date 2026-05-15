const fs = require("node:fs");
const path = require("node:path");
const { buildReferenceWorkbench } = require("../src/reference-workbench");

const samplePath = path.join(__dirname, "..", "data", "sample-manuscript.json");
const manuscript = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = buildReferenceWorkbench(manuscript);

console.log(`Manuscript: ${report.title}`);
console.log(`Status: ${report.dashboard.status}`);
console.log(`Citations discovered: ${report.citations.uniqueKeys.length}`);
console.log(`Missing citations: ${report.citations.missing.join(", ") || "none"}`);
console.log(`Cross references: ${report.crossReferences.occurrences.length}`);
console.log(`Formatting tasks: ${report.tasks.length}`);
console.log(`Top action: ${report.dashboard.topAction}`);
console.log(`Digest: ${report.digest}`);
