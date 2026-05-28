const fs = require("fs");
const path = require("path");
const { auditEnterpriseTenant, renderMarkdownReport, renderSvgSummary } = require("./index");
const { enterprisePolicy, riskyTenant } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = auditEnterpriseTenant(riskyTenant, enterprisePolicy);
fs.writeFileSync(path.join(outputDir, "institutional-admin-audit.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "institutional-admin-audit.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "institutional-admin-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
