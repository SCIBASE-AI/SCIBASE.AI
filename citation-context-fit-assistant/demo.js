const fs = require("fs");
const path = require("path");
const { project } = require("./sample-data");
const { buildReviewPacket, renderMarkdownReport, renderSvgSummary } = require("./index");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const packet = buildReviewPacket(project);

fs.writeFileSync(path.join(reportDir, "summary.json"), `${JSON.stringify(packet, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(reportDir, "reviewer-packet.md"), renderMarkdownReport(packet), "utf8");
fs.writeFileSync(path.join(reportDir, "summary.svg"), renderSvgSummary(packet), "utf8");

console.log(`Generated reports for ${packet.assistant}`);
console.log(`Decision: ${packet.decision}`);
console.log(`Score: ${packet.score}`);
console.log(`Findings: ${packet.findings.length}`);
