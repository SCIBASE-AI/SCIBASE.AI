"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeSuccessionPackets } = require("../src");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "sample_succession_packets.json");
const outDir = path.join(root, "reports");
const packets = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const report = analyzeSuccessionPackets(packets);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Project Ownership Succession Guard Report",
  "",
  `Generated: ${report.generatedAt}`,
  `Packets analyzed: ${report.totalPackets}`,
  `Decision counts: APPROVE ${report.counts.APPROVE}, REVIEW ${report.counts.REVIEW}, HOLD ${report.counts.HOLD}`,
  "",
  "## Findings",
  "",
  ...report.results.flatMap((item) => [
    `### ${item.id}: ${item.title}`,
    "",
    `Decision: ${item.decision}`,
    `Risk score: ${item.riskScore}`,
    `Succession trigger: ${item.hasSuccessionTrigger ? "yes" : "no"}`,
    `Compliance hold: ${item.complianceHold ? "yes" : "no"}`,
    "",
    item.findings.length === 0
      ? "- No succession risk detected."
      : item.findings.map((finding) => `- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`).join("\n"),
    "",
    "Recommended actions:",
    ...item.recommendedActions.map((action) => `- ${action}`),
    ""
  ])
].join("\n");

fs.writeFileSync(path.join(outDir, "reviewer-packet.md"), markdown);

const maxBar = 620;
const total = Math.max(1, report.totalPackets);
const approveWidth = Math.round((report.counts.APPROVE / total) * maxBar);
const reviewWidth = Math.round((report.counts.REVIEW / total) * maxBar);
const holdWidth = Math.round((report.counts.HOLD / total) * maxBar);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
  <rect width="900" height="520" fill="#f8faf8"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="33" font-weight="700" fill="#18211d">Project Ownership Succession Guard</text>
  <text x="56" y="118" font-family="Arial, sans-serif" font-size="19" fill="#3d4b44">Synthetic orphaned-workspace transfer audit for user and project governance.</text>
  <text x="56" y="180" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#18211d">Decision distribution</text>
  <text x="56" y="235" font-family="Arial, sans-serif" font-size="20" fill="#18211d">HOLD</text>
  <rect x="180" y="212" width="${holdWidth}" height="32" rx="4" fill="#cf3f45"/>
  <text x="${190 + holdWidth}" y="235" font-family="Arial, sans-serif" font-size="18" fill="#18211d">${report.counts.HOLD}</text>
  <text x="56" y="295" font-family="Arial, sans-serif" font-size="20" fill="#18211d">REVIEW</text>
  <rect x="180" y="272" width="${reviewWidth}" height="32" rx="4" fill="#e0a12b"/>
  <text x="${190 + reviewWidth}" y="295" font-family="Arial, sans-serif" font-size="18" fill="#18211d">${report.counts.REVIEW}</text>
  <text x="56" y="355" font-family="Arial, sans-serif" font-size="20" fill="#18211d">APPROVE</text>
  <rect x="180" y="332" width="${approveWidth}" height="32" rx="4" fill="#2d7d5f"/>
  <text x="${190 + approveWidth}" y="355" font-family="Arial, sans-serif" font-size="18" fill="#18211d">${report.counts.APPROVE}</text>
  <text x="56" y="430" font-family="Arial, sans-serif" font-size="18" fill="#3d4b44">Checks succession triggers, eligible successors, compliance holds, notices, attribution, and audit receipts.</text>
  <text x="56" y="468" font-family="Arial, sans-serif" font-size="16" fill="#61706a">Synthetic generated artifact only. No desktop capture or private data.</text>
</svg>
`;

fs.writeFileSync(path.join(outDir, "summary.svg"), svg);

console.log(JSON.stringify({
  packets: report.totalPackets,
  counts: report.counts,
  outputs: [
    path.join(outDir, "summary.json"),
    path.join(outDir, "reviewer-packet.md"),
    path.join(outDir, "summary.svg")
  ]
}, null, 2));
