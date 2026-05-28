"use strict";

const fs = require("node:fs");
const path = require("node:path");
const packets = require("./data/summary-packets.json");
const { reviewSummaryPackets, summarizeReports } = require("./gate");

const artifactDir = path.join(__dirname, "artifacts");
const reports = reviewSummaryPackets(packets);
const summary = summarizeReports(reports);

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "lay-summary-safety-report.json"), `${JSON.stringify({ summary, reports }, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, "lay-summary-safety-report.md"), renderMarkdown(summary, reports));
fs.writeFileSync(path.join(artifactDir, "lay-summary-safety-flow.svg"), renderSvg(summary));

console.log(`reviewed ${summary.total} lay summaries`);
console.log(`ready=${summary.ready} blocked=${summary.blocked} findings=${summary.findings}`);

function renderMarkdown(reportSummary, reportRows) {
  const lines = [
    "# Lay Summary Safety Gate",
    "",
    "## Summary",
    "",
    `- Summaries reviewed: ${reportSummary.total}`,
    `- Ready: ${reportSummary.ready}`,
    `- Blocked: ${reportSummary.blocked}`,
    `- Findings: ${reportSummary.findings}`,
    "",
    "## Reports",
    "",
  ];

  for (const report of reportRows) {
    lines.push(`### ${report.manuscriptId}`);
    lines.push("");
    lines.push(`- Audience: ${report.audience}`);
    lines.push(`- Decision: ${report.decision}`);
    lines.push(`- Required terms: ${report.receipt.requiredTerms}`);
    for (const finding of report.findings) {
      lines.push(`  - ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(reportSummary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="250" role="img" aria-label="Lay summary safety gate flow">
  <rect width="860" height="250" fill="#111827"/>
  <text x="32" y="44" fill="#f9fafb" font-family="Arial" font-size="22">Lay Summary Safety Gate</text>
  <g font-family="Arial" font-size="14" fill="#e5e7eb">
    <rect x="34" y="88" width="190" height="76" rx="8" fill="#1f2937" stroke="#22c55e"/>
    <text x="58" y="118">Source + lay summary</text>
    <text x="58" y="140">audience packet</text>
    <path d="M224 126 H296" stroke="#9ca3af" stroke-width="2"/>
    <rect x="296" y="88" width="216" height="76" rx="8" fill="#1f2937" stroke="#38bdf8"/>
    <text x="322" y="116">Unsupported claims,</text>
    <text x="322" y="140">uncertainty, terms, scope</text>
    <path d="M512 126 H584" stroke="#9ca3af" stroke-width="2"/>
    <rect x="584" y="88" width="238" height="76" rx="8" fill="#1f2937" stroke="#f97316"/>
    <text x="612" y="116">Ready ${reportSummary.ready} / Blocked ${reportSummary.blocked}</text>
    <text x="612" y="140">Findings ${reportSummary.findings}</text>
  </g>
</svg>
`;
}
