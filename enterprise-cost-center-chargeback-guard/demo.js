const fs = require("fs");
const path = require("path");
const records = require("./sample-data.json");
const { evaluateChargebacks, renderMarkdownReport } = require("./index");

const artifactsDir = path.join(__dirname, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const results = evaluateChargebacks(records);
fs.writeFileSync(path.join(artifactsDir, "chargeback-results.json"), JSON.stringify(results, null, 2));
fs.writeFileSync(path.join(artifactsDir, "chargeback-report.md"), renderMarkdownReport(results));

console.log(renderMarkdownReport(results));
