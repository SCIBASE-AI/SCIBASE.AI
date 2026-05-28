const fs = require("fs");
const path = require("path");
const { reviewProtocolDeviations, renderMarkdownReport, renderSvgSummary } = require("./index");
const { reviewContext, riskyManuscript, riskyProtocol } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = reviewProtocolDeviations(riskyProtocol, riskyManuscript, reviewContext);
fs.writeFileSync(path.join(outputDir, "protocol-deviation-review.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "protocol-deviation-review.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "protocol-deviation-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
