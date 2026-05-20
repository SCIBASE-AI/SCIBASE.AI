const fs = require("node:fs");
const path = require("node:path");
const data = require("./sample-data");
const { renderMarkdown, renderSvg, runAssistant } = require("./index");

const report = runAssistant(data);
const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "claim-consistency-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportsDir, "review-packet.md"), renderMarkdown(report));
fs.writeFileSync(path.join(reportsDir, "claim-consistency.svg"), renderSvg(report));

console.log(JSON.stringify({
  decision: report.summary.releaseStatus,
  averageScore: report.summary.averageScore,
  issueCount: report.summary.totalIssues,
  highRiskClaims: report.summary.highestRiskClaims,
  auditDigest: report.auditDigest,
  reports: [
    "reports/claim-consistency-audit.json",
    "reports/review-packet.md",
    "reports/claim-consistency.svg",
    "reports/demo.mp4"
  ]
}, null, 2));
