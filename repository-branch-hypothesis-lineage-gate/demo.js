const fs = require("node:fs");
const path = require("node:path");
const { evaluateRepository } = require("./index");
const { repository } = require("./sample-data");

const report = evaluateRepository(repository);
const outputDir = path.join(__dirname, "reports");
fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(
  path.join(outputDir, "branch-lineage-review.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
fs.writeFileSync(path.join(outputDir, "branch-lineage-review.md"), toMarkdown(report));
fs.writeFileSync(path.join(outputDir, "branch-lineage-summary.svg"), toSvg(report));

console.log(`Wrote ${report.packets.length} branch lineage packets to ${outputDir}`);

function toMarkdown(report) {
  const lines = [
    "# Repository Branch Hypothesis Lineage Review",
    "",
    `Repository: ${report.repository}`,
    `Current version: ${report.version}`,
    "",
    "## Summary",
    "",
    `- Ready: ${report.summary.ready}`,
    `- Hold: ${report.summary.hold}`,
    `- Block: ${report.summary.block}`,
    `- Highest risk score: ${report.summary.highestRisk}`,
    "",
    "## Branch Packets",
    "",
  ];

  for (const packet of report.packets) {
    lines.push(`### ${packet.branch}`);
    lines.push("");
    lines.push(`- Decision: ${packet.decision}`);
    lines.push(`- Risk score: ${packet.riskScore}`);
    lines.push(`- Version impact: ${packet.versionImpact}`);
    lines.push(`- Hypothesis: ${packet.hypothesisId}`);
    lines.push(`- Protocol snapshot: ${packet.protocolSnapshot}`);
    lines.push("");
    lines.push("Findings:");
    if (packet.findings.length === 0) {
      lines.push("- none");
    } else {
      for (const finding of packet.findings) {
        lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
      }
    }
    lines.push("");
    lines.push("Citation notes:");
    for (const note of packet.citationNotes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function toSvg(report) {
  const rows = report.packets
    .map((packet, index) => {
      const y = 130 + index * 72;
      const color = packet.decision === "ready" ? "#0f766e" : packet.decision === "hold" ? "#b45309" : "#b91c1c";
      return `
  <g transform="translate(36 ${y})">
    <rect width="820" height="50" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
    <circle cx="24" cy="25" r="9" fill="${color}"/>
    <text x="48" y="21" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(packet.branch)}</text>
    <text x="48" y="40" font-size="13" fill="#475569">decision=${packet.decision} risk=${packet.riskScore} version=${packet.versionImpact}</text>
  </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="330" viewBox="0 0 900 330" role="img" aria-label="Branch lineage gate summary">
  <rect width="900" height="330" fill="#ffffff"/>
  <text x="36" y="48" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#0f172a">Branch Hypothesis Lineage Gate</text>
  <text x="36" y="76" font-family="Arial, sans-serif" font-size="14" fill="#475569">${escapeXml(report.repository)} · ${escapeXml(report.version)}</text>
  <text x="36" y="104" font-family="Arial, sans-serif" font-size="14" fill="#334155">Ready ${report.summary.ready} · Hold ${report.summary.hold} · Block ${report.summary.block}</text>
  <g font-family="Arial, sans-serif">${rows}
  </g>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
