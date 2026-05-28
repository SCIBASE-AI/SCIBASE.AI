const fs = require("fs");
const path = require("path");
const { auditProjectRepository, renderMarkdownReport, renderSvgSummary } = require("./index");
const { auditPolicy, riskyProject } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = auditProjectRepository(riskyProject, auditPolicy);
fs.writeFileSync(path.join(outputDir, "repository-integrity-audit.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "repository-integrity-audit.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "repository-integrity-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
