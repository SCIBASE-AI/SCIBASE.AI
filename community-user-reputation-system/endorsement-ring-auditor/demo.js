const fs = require("fs");
const path = require("path");
const { auditEndorsementRing, renderMarkdownReport, renderSvgSummary } = require("./index");
const { auditPolicy, riskyBatch } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = auditEndorsementRing(riskyBatch, auditPolicy);
fs.writeFileSync(path.join(outputDir, "endorsement-ring-audit.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "endorsement-ring-audit.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "endorsement-ring-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
