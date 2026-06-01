const fs = require("node:fs");
const path = require("node:path");
const { evaluateChallengeWithdrawal } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const clean = evaluateChallengeWithdrawal(cleanPacket);
const risky = evaluateChallengeWithdrawal(riskyPacket);

function writeJson(name, value) {
  fs.writeFileSync(path.join(reportsDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findingTable(report) {
  return report.findings
    .slice(0, 12)
    .map((finding) => `| ${finding.severity} | ${finding.code} | ${finding.action} |`)
    .join("\n");
}

function writeHandoff(report) {
  const lines = [
    "# Challenge Withdrawal Reimbursement Handoff",
    "",
    `Decision: ${report.summary.decision}`,
    `Affected solvers: ${report.summary.affectedSolvers}`,
    `Recommended reimbursement: $${report.summary.recommendedReimbursementUsd.toFixed(2)}`,
    `Funded shortfall: $${report.summary.fundedShortfallUsd.toFixed(2)}`,
    `Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Priority Findings",
    "",
    "| Severity | Code | Remediation |",
    "| --- | --- | --- |",
    findingTable(report),
    "",
    "## Team Recommendations",
    "",
    ...report.challenges.flatMap((challenge) => [
      `### ${challenge.id}`,
      "",
      "| Team | Recommended | Recorded | Shortfall | Action |",
      "| --- | ---: | ---: | ---: | --- |",
      ...challenge.recommendations.map((item) => (
        `| ${item.teamId} | $${item.recommendedUsd.toFixed(2)} | $${item.recordedUsd.toFixed(2)} | $${item.shortfallUsd.toFixed(2)} | ${item.action} |`
      )),
      ""
    ])
  ];
  fs.writeFileSync(path.join(reportsDir, "risky-withdrawal-handoff.md"), `${lines.join("\n")}\n`);
}

function writeSvg(cleanReport, riskyReport) {
  const width = 960;
  const height = 540;
  const cleanBar = Math.round((cleanReport.summary.recommendedReimbursementUsd / 2600) * 300);
  const riskyBar = Math.round((riskyReport.summary.recommendedReimbursementUsd / 2600) * 300);
  const shortfallBar = Math.round((riskyReport.summary.fundedShortfallUsd / 2600) * 300);
  const rows = riskyReport.findings.slice(0, 8).map((finding, index) => {
    const y = 250 + index * 26;
    const color = finding.severity === "critical" ? "#991b1b" : finding.severity === "high" ? "#dc2626" : "#d97706";
    return `<g><rect x="536" y="${y - 15}" width="12" height="12" rx="2" fill="${color}"/><text x="558" y="${y - 5}" font-size="14" fill="#334155">${escapeXml(finding.code)}</text></g>`;
  }).join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <rect x="48" y="44" width="864" height="452" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="48" y="44" width="864" height="8" rx="4" fill="#0f172a"/>
  <text x="84" y="94" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#0f172a">Challenge withdrawal reimbursement guard</text>
  <text x="84" y="126" font-family="Arial, sans-serif" font-size="15" fill="#475569">Deterministic closeout review for sponsor cancellations after solvers have started work.</text>
  <text x="96" y="180" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Clean closeout</text>
  <rect x="96" y="196" width="300" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="96" y="196" width="${cleanBar}" height="34" rx="4" fill="#10b981"/>
  <text x="412" y="218" font-family="Arial, sans-serif" font-size="14" fill="#0f172a">$${cleanReport.summary.recommendedReimbursementUsd.toFixed(2)}</text>
  <text x="96" y="270" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Risky closeout</text>
  <rect x="96" y="286" width="300" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="96" y="286" width="${riskyBar}" height="34" rx="4" fill="#ef4444"/>
  <text x="412" y="308" font-family="Arial, sans-serif" font-size="14" fill="#0f172a">$${riskyReport.summary.recommendedReimbursementUsd.toFixed(2)}</text>
  <text x="96" y="360" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Reserve shortfall</text>
  <rect x="96" y="376" width="300" height="34" rx="4" fill="#e2e8f0"/>
  <rect x="96" y="376" width="${shortfallBar}" height="34" rx="4" fill="#f59e0b"/>
  <text x="412" y="398" font-family="Arial, sans-serif" font-size="14" fill="#0f172a">$${riskyReport.summary.fundedShortfallUsd.toFixed(2)}</text>
  <text x="536" y="180" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Top risky findings</text>
  ${rows}
  <text x="536" y="462" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Decision: ${escapeXml(riskyReport.summary.decision)} | ${riskyReport.summary.auditDigest.slice(0, 28)}...</text>
</svg>
`;
  fs.writeFileSync(path.join(reportsDir, "withdrawal-dashboard.svg"), svg);
}

writeJson("clean-withdrawal-report.json", clean);
writeJson("risky-withdrawal-report.json", risky);
writeHandoff(risky);
writeSvg(clean, risky);

console.log("Wrote challenge withdrawal reimbursement guard reports:");
console.log(`- ${path.join(reportsDir, "clean-withdrawal-report.json")}`);
console.log(`- ${path.join(reportsDir, "risky-withdrawal-report.json")}`);
console.log(`- ${path.join(reportsDir, "risky-withdrawal-handoff.md")}`);
console.log(`- ${path.join(reportsDir, "withdrawal-dashboard.svg")}`);
