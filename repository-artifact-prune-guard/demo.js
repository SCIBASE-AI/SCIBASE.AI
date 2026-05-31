"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeArtifactPrunePlan } = require("./artifactPruneGuard");
const { sampleRepository } = require("./sampleRepository");

const report = analyzeArtifactPrunePlan(sampleRepository);
const reportsDir = path.join(__dirname, "reports");

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(
  path.join(reportsDir, "artifact-prune-packet.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
fs.writeFileSync(path.join(reportsDir, "artifact-prune-report.md"), renderMarkdown(report));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvg(report));

console.log(`Artifact prune guard status: ${report.status}`);
console.log(`Approved: ${report.summary.approved}; blocked: ${report.summary.blocked}`);

function renderMarkdown(packet) {
  const lines = [
    "# Artifact Prune Guard Report",
    "",
    `Status: ${packet.status}`,
    `Checked at: ${packet.checkedAt}`,
    "",
    "## Approved Prunes",
    "",
    ...packet.approvedPrunes.map((item) => `- ${item.artifactId}: ${item.reason}`),
    "",
    "## Blocked Prunes",
    "",
  ];

  for (const item of packet.blockedPrunes) {
    lines.push(`- ${item.artifactId} (${item.path})`);
    for (const blocker of item.blockers) {
      lines.push(`  - ${blocker.code}: ${blocker.message}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const approvedWidth = 70 + packet.summary.approved * 70;
  const blockedWidth = 70 + packet.summary.blocked * 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="160" role="img" aria-label="Artifact prune guard summary">
  <rect width="520" height="160" fill="#f8fafc"/>
  <text x="24" y="36" font-family="Arial" font-size="20" fill="#0f172a">Artifact Prune Guard</text>
  <text x="24" y="64" font-family="Arial" font-size="13" fill="#475569">Status: ${packet.status}</text>
  <rect x="24" y="88" width="${approvedWidth}" height="28" fill="#16a34a"/>
  <text x="34" y="107" font-family="Arial" font-size="13" fill="#ffffff">Approved ${packet.summary.approved}</text>
  <rect x="24" y="120" width="${blockedWidth}" height="28" fill="#dc2626"/>
  <text x="34" y="139" font-family="Arial" font-size="13" fill="#ffffff">Blocked ${packet.summary.blocked}</text>
</svg>
`;
}
