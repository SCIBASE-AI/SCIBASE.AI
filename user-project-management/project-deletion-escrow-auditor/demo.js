const fs = require("fs");
const path = require("path");
const { auditDeletionEscrow, renderMarkdownReport, renderSvgSummary } = require("./index");
const { auditPolicy, riskyProject, riskyRequest } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = auditDeletionEscrow(riskyProject, riskyRequest, auditPolicy);
fs.writeFileSync(path.join(outputDir, "project-deletion-escrow-audit.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "project-deletion-escrow-audit.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "project-deletion-escrow-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
