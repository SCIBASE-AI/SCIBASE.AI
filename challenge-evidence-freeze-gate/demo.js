const fs = require("node:fs");
const path = require("node:path");
const data = require("./sample-data");
const { renderMarkdown, renderSvg, runFreezeGate } = require("./index");

const report = runFreezeGate(data);
const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "freeze-audit.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(reportsDir, "arbitration-packet.md"), renderMarkdown(report));
fs.writeFileSync(path.join(reportsDir, "freeze-gate.svg"), renderSvg(report));

console.log(JSON.stringify({
  decision: report.summary.releaseDecision,
  blockerCount: report.summary.blockerCount,
  totalDiffs: report.summary.totalDiffs,
  excludedFromScoring: [...new Set(report.arbitrationPacket.excludedFromScoring)],
  auditDigest: report.auditDigest,
  reports: [
    "reports/freeze-audit.json",
    "reports/arbitration-packet.md",
    "reports/freeze-gate.svg",
    "reports/demo.mp4"
  ]
}, null, 2));
