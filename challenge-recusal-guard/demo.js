const fs = require("fs");
const path = require("path");
const { assignments } = require("./sample-data");
const { evaluateAssignments } = require("./index");

const outDir = path.join(__dirname, "reports");
fs.mkdirSync(outDir, { recursive: true });

const report = evaluateAssignments(assignments);
fs.writeFileSync(path.join(outDir, "recusal-report.json"), JSON.stringify(report, null, 2));

const rows = report.reports
  .map((entry) => `| ${entry.challengeId} | ${entry.evaluatorId} | ${entry.decision} | ${entry.findings.length} |`)
  .join("\n");

fs.writeFileSync(
  path.join(outDir, "recusal-report.md"),
  [
    "# Challenge Conflict-of-Interest Recusal Guard",
    "",
    "| Challenge | Evaluator | Decision | Findings |",
    "| --- | --- | --- | ---: |",
    rows,
    "",
    `Payout holds: ${report.payoutHolds}`,
    `Evaluator recusals: ${report.recusals}`,
    `Disclosure gates: ${report.disclosures}`
  ].join("\n")
);

fs.writeFileSync(
  path.join(outDir, "summary.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" role="img" aria-label="Challenge recusal guard summary">
  <rect width="760" height="260" fill="#11141a"/>
  <text x="32" y="48" fill="#f5f7fb" font-family="Arial" font-size="24">Challenge Recusal Guard</text>
  <text x="32" y="84" fill="#b8c2d6" font-family="Arial" font-size="15">Synthetic COI checks before scoring and payout decisions</text>
  <rect x="32" y="122" width="${report.payoutHolds * 150}" height="38" fill="#c43f4d"/>
  <text x="42" y="147" fill="#fff" font-family="Arial" font-size="15">${report.payoutHolds} payout holds</text>
  <rect x="32" y="174" width="${report.recusals * 150}" height="38" fill="#e48a2a"/>
  <text x="42" y="199" fill="#fff" font-family="Arial" font-size="15">${report.recusals} recusals</text>
</svg>`
);

console.log(JSON.stringify({
  totalAssignments: report.totalAssignments,
  payoutHolds: report.payoutHolds,
  recusals: report.recusals,
  disclosures: report.disclosures
}, null, 2));
