const fs = require("fs");
const path = require("path");
const { replacementPreview, renderMarkdownReport, renderSvgSummary } = require("./index");
const { riskyDocument, riskyOperation } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = replacementPreview(riskyDocument, riskyOperation);
fs.writeFileSync(path.join(outputDir, "find-replace-review.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "find-replace-review.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "find-replace-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
