const fs = require("fs");
const path = require("path");
const { analyzeMissingData, renderMarkdownReport, renderSvgSummary } = require("./index");
const { highRiskStudy } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = analyzeMissingData(highRiskStudy);
fs.writeFileSync(path.join(outputDir, "missing-data-review.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "missing-data-review.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "missing-data-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
