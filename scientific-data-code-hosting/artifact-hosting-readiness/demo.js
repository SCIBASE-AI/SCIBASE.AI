const fs = require("fs");
const path = require("path");
const { evaluateArtifactHosting, renderMarkdownReport, renderSvgSummary } = require("./index");
const { hostingPolicy, riskyBundle } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

const result = evaluateArtifactHosting(riskyBundle, hostingPolicy);
fs.writeFileSync(path.join(outputDir, "artifact-hosting-readiness.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "artifact-hosting-readiness.md"), renderMarkdownReport(result));
fs.writeFileSync(path.join(outputDir, "artifact-hosting-summary.svg"), renderSvgSummary(result));

console.log(`decision=${result.decision} riskScore=${result.riskScore} findings=${result.findings.length}`);
console.log(`reports=${outputDir}`);
