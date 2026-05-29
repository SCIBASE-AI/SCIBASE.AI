const fs = require("fs");
const path = require("path");

const { evaluateResidencyTransfers } = require("./index");
const { scenarios } = require("./sample-data");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const report = evaluateResidencyTransfers(scenarios);
fs.writeFileSync(
  path.join(reportDir, "data-residency-transfer-report.json"),
  `${JSON.stringify(report, null, 2)}\n`
);

const lines = [
  "# Project Data Residency Transfer Guard",
  "",
  `Generated: ${report.generatedAt}`,
  `Report digest: \`${report.reportDigest}\``,
  "",
  "## Summary",
  "",
  `- Total scenarios: ${report.summary.total}`,
  `- Approved: ${report.summary.approved}`,
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
  lines.push(`- Action: \`${decision.action}\``);
  lines.push(`- Object: \`${decision.targetObject}\``);
  lines.push(`- Classification: \`${decision.classification}\``);
  lines.push(`- Route: ${decision.homeRegion} -> ${decision.destinationRegion}`);
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

fs.writeFileSync(path.join(reportDir, "data-residency-transfer-report.md"), `${lines.join("\n")}\n`);

const blocked = report.summary.blocked;
const review = report.summary.needs_review;
const approved = report.summary.approved;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f6f0df"/>
  <rect x="52" y="48" width="856" height="444" rx="10" fill="#fffaf0" stroke="#614a2f" stroke-width="3"/>
  <text x="92" y="116" font-family="Georgia, serif" font-size="38" fill="#2f2418">Data Residency Transfer Guard</text>
  <text x="94" y="160" font-family="Menlo, monospace" font-size="18" fill="#5c4630">Synthetic reviewer artifact for SCIBASE User &amp; Project Management</text>
  <g font-family="Menlo, monospace" font-size="22">
    <rect x="96" y="214" width="${approved * 112}" height="54" fill="#2f855a"/>
    <text x="112" y="249" fill="#fff">approved ${approved}</text>
    <rect x="96" y="290" width="${Math.max(1, review) * 112}" height="54" fill="#b7791f"/>
    <text x="112" y="325" fill="#fff">review ${review}</text>
    <rect x="96" y="366" width="${blocked * 112}" height="54" fill="#b83232"/>
    <text x="112" y="401" fill="#fff">blocked ${blocked}</text>
  </g>
  <text x="94" y="462" font-family="Menlo, monospace" font-size="16" fill="#614a2f">Report digest: ${report.reportDigest.slice(0, 32)}...</text>
</svg>
`;
fs.writeFileSync(path.join(reportDir, "summary.svg"), svg);

console.log(JSON.stringify(report.summary, null, 2));
