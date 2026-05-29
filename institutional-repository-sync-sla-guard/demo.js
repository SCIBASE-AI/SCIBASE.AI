const fs = require("fs");
const path = require("path");

const { evaluateSyncJobs } = require("./index");
const { syncJobs } = require("./sample-data");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = evaluateSyncJobs(syncJobs);
fs.writeFileSync(path.join(reportDir, "repository-sync-sla-report.json"), `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  "# Institutional Repository Sync SLA Guard",
  "",
  `Generated: ${report.generatedAt}`,
  `Report digest: \`${report.reportDigest}\``,
  "",
  "## Summary",
  "",
  `- Total jobs: ${report.summary.total}`,
  `- Ready: ${report.summary.ready}`,
  `- Needs review: ${report.summary.needs_review}`,
  `- Blocked: ${report.summary.blocked}`,
  `- Findings: ${report.summary.findingCount}`,
  "",
  "## Decisions",
  "",
];

for (const decision of report.decisions) {
  lines.push(`### ${decision.id}`);
  lines.push("");
  lines.push(`- Decision: **${decision.decision}**`);
  lines.push(`- Project: ${decision.project}`);
  lines.push(`- Target: ${decision.targetRepository} (${decision.targetType})`);
  lines.push(`- Escalation: \`${decision.escalation}\``);
  lines.push(`- Audit digest: \`${decision.auditDigest}\``);
  lines.push("- Findings:");
  const findings = decision.findings.length
    ? decision.findings
    : [{ severity: "info", code: "none", message: "No blocking or review findings." }];
  for (const finding of findings) {
    lines.push(`  - ${finding.severity}: ${finding.code} - ${finding.message}`);
  }
  lines.push("");
}
if (lines[lines.length - 1] === "") {
  lines.pop();
}
fs.writeFileSync(path.join(reportDir, "repository-sync-sla-report.md"), `${lines.join("\n")}\n`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#eef3f7"/>
  <rect x="54" y="52" width="852" height="436" rx="8" fill="#ffffff" stroke="#1f3349" stroke-width="3"/>
  <text x="86" y="112" font-family="Georgia, serif" font-size="34" fill="#1f3349">Institutional Repository Sync SLA Guard</text>
  <text x="88" y="156" font-family="Menlo, monospace" font-size="18" fill="#42566f">Enterprise export-pipeline reviewer artifact</text>
  <rect x="96" y="210" width="${Math.max(1, report.summary.ready) * 120}" height="54" fill="#2f855a"/>
  <rect x="96" y="292" width="${Math.max(1, report.summary.needs_review) * 120}" height="54" fill="#b7791f"/>
  <rect x="96" y="374" width="${Math.max(1, report.summary.blocked) * 120}" height="54" fill="#b83232"/>
  <text x="112" y="245" font-family="Menlo, monospace" font-size="22" fill="#ffffff">ready ${report.summary.ready}</text>
  <text x="112" y="327" font-family="Menlo, monospace" font-size="22" fill="#ffffff">review ${report.summary.needs_review}</text>
  <text x="112" y="409" font-family="Menlo, monospace" font-size="22" fill="#ffffff">blocked ${report.summary.blocked}</text>
  <text x="86" y="464" font-family="Menlo, monospace" font-size="16" fill="#42566f">Digest ${report.reportDigest.slice(0, 32)}...</text>
</svg>
`;
fs.writeFileSync(path.join(reportDir, "summary.svg"), svg);

console.log(JSON.stringify(report.summary, null, 2));
