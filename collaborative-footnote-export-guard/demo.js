const fs = require("fs");
const path = require("path");
const { evaluateFootnoteExport, toMarkdownReport, toSvgBadge } = require("./footnoteExportGuard");
const sampleWorkspace = require("./sampleWorkspace");

const result = evaluateFootnoteExport(sampleWorkspace);
const reportDir = path.join(__dirname, "reports");

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, "footnote-export-packet.json"), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(path.join(reportDir, "footnote-export-report.md"), toMarkdownReport(result));
fs.writeFileSync(path.join(reportDir, "summary.svg"), toSvgBadge(result));

console.log(`decision=${result.decision}`);
console.log(`findings=${result.findings.length}`);
console.log(`reports=${reportDir}`);
