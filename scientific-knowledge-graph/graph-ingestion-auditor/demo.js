const fs = require("fs");
const path = require("path");
const { auditKnowledgeGraph, renderMarkdownReport, renderSvgSummary } = require("./index");
const { graphPolicy, riskyGraph } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = auditKnowledgeGraph(riskyGraph, graphPolicy);
fs.writeFileSync(path.join(outputDir, "graph-ingestion-audit.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "graph-ingestion-audit.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "graph-ingestion-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
