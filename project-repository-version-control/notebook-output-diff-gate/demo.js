"use strict";

const fs = require("node:fs");
const path = require("node:path");
const packets = require("./data/notebook-diffs.json");
const { reviewNotebookDiffs, summarizeReports } = require("./gate");

const artifactDir = path.join(__dirname, "artifacts");
const reports = reviewNotebookDiffs(packets);
const summary = summarizeReports(reports);

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "notebook-output-diff-report.json"), `${JSON.stringify({ summary, reports }, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, "notebook-output-diff-report.md"), renderMarkdown(summary, reports));
fs.writeFileSync(path.join(artifactDir, "notebook-output-diff-flow.svg"), renderSvg(summary));

console.log(`reviewed ${summary.total} notebook diffs`);
console.log(`ready=${summary.ready} blocked=${summary.blocked} findings=${summary.findings}`);

function renderMarkdown(reportSummary, reportRows) {
  const lines = [
    "# Notebook Output Diff Gate",
    "",
    "## Summary",
    "",
    `- Notebook diffs reviewed: ${reportSummary.total}`,
    `- Ready: ${reportSummary.ready}`,
    `- Blocked: ${reportSummary.blocked}`,
    `- Findings: ${reportSummary.findings}`,
    "",
    "## Reports",
    "",
  ];

  for (const report of reportRows) {
    lines.push(`### ${report.repositoryId}`);
    lines.push("");
    lines.push(`- Notebook: ${report.notebookPath}`);
    lines.push(`- Commit: ${report.commitSha}`);
    lines.push(`- Decision: ${report.decision}`);
    lines.push(`- Changed cells: ${report.receipt.changedCells}`);
    for (const finding of report.findings) {
      lines.push(`  - ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(reportSummary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="250" role="img" aria-label="Notebook output diff gate flow">
  <rect width="860" height="250" fill="#111827"/>
  <text x="32" y="44" fill="#f9fafb" font-family="Arial" font-size="22">Notebook Output Diff Gate</text>
  <g font-family="Arial" font-size="14" fill="#e5e7eb">
    <rect x="34" y="88" width="190" height="76" rx="8" fill="#1f2937" stroke="#38bdf8"/>
    <text x="58" y="118">Notebook diff packet</text>
    <text x="58" y="140">cells + output digests</text>
    <path d="M224 126 H296" stroke="#9ca3af" stroke-width="2"/>
    <rect x="296" y="88" width="216" height="76" rx="8" fill="#1f2937" stroke="#a78bfa"/>
    <text x="322" y="116">Code, output, run,</text>
    <text x="322" y="140">environment checks</text>
    <path d="M512 126 H584" stroke="#9ca3af" stroke-width="2"/>
    <rect x="584" y="88" width="238" height="76" rx="8" fill="#1f2937" stroke="#f97316"/>
    <text x="612" y="116">Ready ${reportSummary.ready} / Blocked ${reportSummary.blocked}</text>
    <text x="612" y="140">Findings ${reportSummary.findings}</text>
  </g>
</svg>
`;
}
