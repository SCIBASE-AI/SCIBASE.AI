"use strict";

const fs = require("node:fs");
const path = require("node:path");
const packets = require("./data/manuscript-measurements.json");
const { reviewMeasurements, summarizeReports } = require("./assistant");

const artifactDir = path.join(__dirname, "artifacts");
const reports = reviewMeasurements(packets);
const summary = summarizeReports(reports);

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactDir, "review-report.json"),
  `${JSON.stringify({ summary, reports }, null, 2)}\n`,
);
fs.writeFileSync(path.join(artifactDir, "review-report.md"), renderMarkdown(summary, reports));
fs.writeFileSync(path.join(artifactDir, "review-flow.svg"), renderSvg(summary));

console.log(`reviewed ${summary.total} manuscript packets`);
console.log(`ready=${summary.ready} hold=${summary.hold} high_findings=${summary.highFindings}`);

function renderMarkdown(reportSummary, reportRows) {
  const lines = [
    "# Unit and Dimension Consistency Review",
    "",
    "## Summary",
    "",
    `- Manuscripts reviewed: ${reportSummary.total}`,
    `- Reviewer-ready: ${reportSummary.ready}`,
    `- Held for correction: ${reportSummary.hold}`,
    `- High-severity findings: ${reportSummary.highFindings}`,
    `- Medium-severity findings: ${reportSummary.mediumFindings}`,
    "",
    "## Manuscript Reports",
    "",
  ];

  for (const report of reportRows) {
    lines.push(`### ${report.manuscriptId}`);
    lines.push("");
    lines.push(`- Title: ${report.title}`);
    lines.push(`- Decision: ${report.decision}`);
    lines.push(`- Findings: ${report.summary.total}`);
    for (const item of report.findings) {
      lines.push(`  - ${item.severity}: ${item.code} - ${item.message}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(reportSummary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="240" role="img" aria-label="Unit and dimension consistency assistant flow">
  <rect width="820" height="240" fill="#111827"/>
  <text x="32" y="42" fill="#f9fafb" font-family="Arial" font-size="22">Unit and Dimension Consistency Assistant</text>
  <g font-family="Arial" font-size="14" fill="#e5e7eb">
    <rect x="34" y="86" width="170" height="72" rx="8" fill="#1f2937" stroke="#38bdf8"/>
    <text x="58" y="116">Measurement packet</text>
    <text x="58" y="138">units + claims</text>
    <path d="M204 122 H278" stroke="#9ca3af" stroke-width="2"/>
    <rect x="278" y="86" width="210" height="72" rx="8" fill="#1f2937" stroke="#a78bfa"/>
    <text x="304" y="112">Dimension, denominator,</text>
    <text x="304" y="136">basis, precision checks</text>
    <path d="M488 122 H562" stroke="#9ca3af" stroke-width="2"/>
    <rect x="562" y="86" width="220" height="72" rx="8" fill="#1f2937" stroke="#f97316"/>
    <text x="590" y="112">Ready ${reportSummary.ready} / Hold ${reportSummary.hold}</text>
    <text x="590" y="136">High findings ${reportSummary.highFindings}</text>
  </g>
</svg>
`;
}
