const fs = require("fs");
const path = require("path");
const { buildInvoicePreview, renderMarkdownReport, renderSvgSummary } = require("./index");
const { pricingCatalog, reviewContext, riskyLabAccount } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = buildInvoicePreview(riskyLabAccount, pricingCatalog, reviewContext);
fs.writeFileSync(path.join(outputDir, "billing-readiness-preview.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "billing-readiness-report.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "billing-readiness-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} total=${result.totalUsd} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
