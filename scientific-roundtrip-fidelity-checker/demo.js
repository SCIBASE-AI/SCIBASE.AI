const fs = require("node:fs");
const path = require("node:path");
const data = require("./sample-data");
const { renderMarkdown, renderSvg, runRoundTripAudit } = require("./index");

const report = runRoundTripAudit(data);
const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "roundtrip-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportsDir, "review-packet.md"), renderMarkdown(report));
fs.writeFileSync(path.join(reportsDir, "roundtrip-fidelity.svg"), renderSvg(report));

console.log(JSON.stringify({
  decision: report.summary.releaseDecision,
  averageScore: report.summary.averageScore,
  totalFindings: report.summary.totalFindings,
  weakestFormats: report.summary.weakestFormats,
  auditDigest: report.auditDigest,
  reports: [
    "reports/roundtrip-audit.json",
    "reports/review-packet.md",
    "reports/roundtrip-fidelity.svg",
    "reports/demo.mp4"
  ]
}, null, 2));
