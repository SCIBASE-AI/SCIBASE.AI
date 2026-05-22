"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeManuscript } = require("./index");
const { sampleManuscript } = require("./sample-data");

const outputDir = path.join(__dirname, "reports");
const report = analyzeManuscript(sampleManuscript);

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "unit-consistency-report.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
fs.writeFileSync(
  path.join(outputDir, "unit-consistency-report.md"),
  renderMarkdown(report)
);
fs.writeFileSync(
  path.join(outputDir, "unit-consistency-summary.svg"),
  renderSvg(report)
);
fs.writeFileSync(
  path.join(outputDir, "demo-script.txt"),
  renderDemoScript(report)
);

console.log(`Wrote reports to ${outputDir}`);

function renderMarkdown(result) {
  const lines = [
    "# Manuscript Unit Consistency Report",
    "",
    `Manuscript: ${result.summary.title}`,
    `Audit digest: ${result.auditDigest}`,
    `Readiness: ${result.summary.readiness} (${result.summary.readinessScore}/100)`,
    "",
    "## Findings",
    "",
  ];

  if (result.findings.length === 0) {
    lines.push("No unit consistency findings were detected.");
  } else {
    result.findings.forEach((finding) => {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.type}: ${finding.message}`);
      lines.push(`  Evidence: ${finding.evidence}`);
      lines.push(`  Action: ${finding.recommendation}`);
    });
  }

  lines.push("", "## Reviewer Actions", "");
  result.reviewerActions.forEach((action) => {
    lines.push(`- P${action.priority} ${action.action} (${action.sourceId})`);
  });

  lines.push("", "## Measurement Inventory", "");
  result.measurementInventory.forEach((measurement) => {
    lines.push(`- ${measurement.sourceId}: ${measurement.raw} -> ${measurement.unitFamily} (${measurement.subject || "untracked"})`);
  });

  return `${lines.join("\n")}\n`;
}

function renderDemoScript(result) {
  return [
    "Demo storyboard for manuscript-unit-consistency-assistant",
    "",
    "1. Load a draft manuscript packet with sections, tables, and tracked terms.",
    `2. Extract ${result.summary.measurementsReviewed} measurements from methods, results, and table cells.`,
    `3. Surface ${result.findings.length} reviewer findings, prioritizing high-severity blockers first.`,
    "4. Export JSON, Markdown, and SVG artifacts for an AI peer-review aid workflow.",
    "",
    `Readiness result: ${result.summary.readiness} (${result.summary.readinessScore}/100).`,
    `Audit digest: ${result.auditDigest}.`,
    "",
  ].join("\n");
}

function renderSvg(result) {
  const high = result.summary.findingsBySeverity.high || 0;
  const medium = result.summary.findingsBySeverity.medium || 0;
  const low = result.summary.findingsBySeverity.low || 0;
  const score = result.summary.readinessScore;
  const bars = [
    { label: "High", value: high, color: "#d92d20", y: 150 },
    { label: "Medium", value: medium, color: "#f79009", y: 205 },
    { label: "Low", value: low, color: "#475467", y: 260 },
  ];
  const max = Math.max(1, high, medium, low);
  const barSvg = bars.map((bar) => {
    const width = 360 * (bar.value / max);
    return [
      `<text x="42" y="${bar.y - 8}" font-family="Arial" font-size="17" fill="#101828">${bar.label}: ${bar.value}</text>`,
      `<rect x="42" y="${bar.y}" width="${Math.max(8, width)}" height="26" rx="4" fill="${bar.color}"/>`,
    ].join("\n");
  }).join("\n");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="920" height="420" viewBox="0 0 920 420">',
    '<rect width="920" height="420" fill="#f8fafc"/>',
    '<rect x="24" y="24" width="872" height="372" rx="8" fill="#ffffff" stroke="#d0d5dd"/>',
    '<text x="42" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Manuscript Unit Consistency Assistant</text>',
    `<text x="42" y="110" font-family="Arial" font-size="18" fill="#475467">${escapeXml(result.summary.title)}</text>`,
    `<text x="42" y="135" font-family="Arial" font-size="15" fill="#667085">Audit digest ${result.auditDigest}</text>`,
    barSvg,
    `<circle cx="730" cy="205" r="86" fill="#ecfdf3" stroke="#12b76a" stroke-width="10"/>`,
    `<text x="730" y="195" font-family="Arial" font-size="42" font-weight="700" text-anchor="middle" fill="#027a48">${score}</text>`,
    '<text x="730" y="228" font-family="Arial" font-size="16" text-anchor="middle" fill="#027a48">readiness score</text>',
    `<text x="730" y="286" font-family="Arial" font-size="17" text-anchor="middle" fill="#344054">${escapeXml(result.summary.readiness)}</text>`,
    '</svg>',
    "",
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
