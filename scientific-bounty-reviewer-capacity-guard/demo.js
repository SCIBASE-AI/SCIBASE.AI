const fs = require("fs");
const path = require("path");
const challenges = require("./sample-data.json");
const { evaluatePortfolio, renderMarkdownReport } = require("./index");

const artifactsDir = path.join(__dirname, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const results = evaluatePortfolio(challenges);
fs.writeFileSync(path.join(artifactsDir, "reviewer-capacity-results.json"), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(artifactsDir, "reviewer-capacity-report.md"), renderMarkdownReport(results));

console.log(renderMarkdownReport(results));
