const fs = require("fs");
const path = require("path");
const { evaluateStatisticalPower, renderMarkdownReport, renderSvgSummary } = require("./index");
const { reviewContext, underpoweredManuscript } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = evaluateStatisticalPower(underpoweredManuscript, reviewContext);
fs.writeFileSync(path.join(outputDir, "statistical-power-review.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "statistical-power-review.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "statistical-power-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
