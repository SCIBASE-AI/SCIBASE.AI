const fs = require("fs");
const path = require("path");
const packets = require("./sample-data.json");
const { evaluateNotebooks, renderMarkdownReport } = require("./index");

const artifactsDir = path.join(__dirname, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const results = evaluateNotebooks(packets);
fs.writeFileSync(path.join(artifactsDir, "notebook-rerun-results.json"), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(artifactsDir, "notebook-rerun-report.md"), renderMarkdownReport(results));

console.log(renderMarkdownReport(results));
