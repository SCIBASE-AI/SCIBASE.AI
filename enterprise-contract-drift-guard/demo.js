const fs = require("fs");
const path = require("path");
const { contracts } = require("./sample-data");
const { evaluateContracts } = require("./index");

const outDir = path.join(__dirname, "reports");
fs.mkdirSync(outDir, { recursive: true });

const report = evaluateContracts(contracts);
fs.writeFileSync(path.join(outDir, "contract-drift-report.json"), JSON.stringify(report, null, 2));

const rows = report.reports
  .map((entry) => `| ${entry.system} | ${entry.decision} | ${entry.highestSeverity} | ${entry.findings.length} |`)
  .join("\n");

fs.writeFileSync(
  path.join(outDir, "contract-drift-report.md"),
  [
    "# Enterprise Contract Drift Guard",
    "",
    "| System | Decision | Highest severity | Findings |",
    "| --- | --- | --- | ---: |",
    rows,
    "",
    `Release holds: ${report.releaseHolds}`,
    `Approvals: ${report.approvals}`
  ].join("\n")
);

fs.writeFileSync(
  path.join(outDir, "summary.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" role="img" aria-label="Enterprise contract drift summary">
  <rect width="760" height="260" fill="#101820"/>
  <text x="32" y="48" fill="#f2f7f2" font-family="Arial" font-size="24">Enterprise Contract Drift Guard</text>
  <text x="32" y="86" fill="#b6c2c9" font-family="Arial" font-size="15">Synthetic institutional integration contract review</text>
  <rect x="32" y="122" width="${report.releaseHolds * 120}" height="42" fill="#d64545"/>
  <text x="40" y="149" fill="#fff" font-family="Arial" font-size="16">${report.releaseHolds} release holds</text>
  <rect x="32" y="178" width="${Math.max(report.approvals, 1) * 120}" height="42" fill="#35a66f"/>
  <text x="40" y="205" fill="#fff" font-family="Arial" font-size="16">${report.approvals} approvals</text>
</svg>`
);

console.log(JSON.stringify({
  totalContracts: report.totalContracts,
  releaseHolds: report.releaseHolds,
  approvals: report.approvals,
  findings: report.reports.reduce((sum, entry) => sum + entry.findings.length, 0)
}, null, 2));
