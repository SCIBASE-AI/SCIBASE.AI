const fs = require("fs");
const path = require("path");
const studies = require("./sample-data.json");
const { evaluateStudies, renderMarkdownReport } = require("./index");

const artifactsDir = path.join(__dirname, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const results = evaluateStudies(studies);
fs.writeFileSync(path.join(artifactsDir, "preregistration-results.json"), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(artifactsDir, "preregistration-report.md"), renderMarkdownReport(results));

console.log(renderMarkdownReport(results));
