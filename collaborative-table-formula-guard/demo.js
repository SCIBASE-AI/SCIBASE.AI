"use strict";

const fs = require("fs");
const path = require("path");
const { auditCollaborativeTableFormulaGuard } = require("./index");

const samplePath = path.join(__dirname, "samples", "problem-table.json");
const artifactDir = path.join(__dirname, "artifacts");
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = auditCollaborativeTableFormulaGuard(sample, { tolerance: 1e-6 });

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "table-formula-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, "table-formula-audit.md"), renderMarkdown(report));
fs.writeFileSync(path.join(artifactDir, "table-formula-audit.svg"), renderSvg(report));

console.log(`decision=${report.decision}`);
console.log(`issues=${report.summary.total}`);
console.log(`artifacts=${artifactDir}`);

function renderMarkdown(report) {
  const rows = report.issues.map((finding) => (
    `| ${finding.severity} | ${finding.code} | ${finding.sectionId} | ${finding.tableId} | ${finding.cell || ""} | ${finding.message} |`
  ));

  return [
    "# Collaborative Table Formula Audit",
    "",
    `Document: ${report.documentId}`,
    `Decision: ${report.decision}`,
    `Issue counts: high ${report.summary.high}, medium ${report.summary.medium}, low ${report.summary.low}`,
    "",
    "| Severity | Code | Section | Table | Cell | Message |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Remediation",
    "",
    ...report.remediation.map((action) => `- ${action}`),
    "",
  ].join("\n");
}

function renderSvg(report) {
  const high = report.summary.high || 0;
  const medium = report.summary.medium || 0;
  const low = report.summary.low || 0;
  const total = report.summary.total || 1;
  const width = 720;
  const barWidth = 520;

  const bars = [
    { label: "High", value: high, color: "#b42318", y: 128 },
    { label: "Medium", value: medium, color: "#b54708", y: 188 },
    { label: "Low", value: low, color: "#027a48", y: 248 },
  ].map((bar) => {
    const filled = Math.max(3, Math.round((bar.value / total) * barWidth));
    return [
      `<text x="48" y="${bar.y + 23}" font-size="18" fill="#1d2939">${bar.label}</text>`,
      `<rect x="150" y="${bar.y}" width="${barWidth}" height="32" rx="4" fill="#eaecf0"/>`,
      `<rect x="150" y="${bar.y}" width="${filled}" height="32" rx="4" fill="${bar.color}"/>`,
      `<text x="685" y="${bar.y + 23}" font-size="18" fill="#1d2939" text-anchor="end">${bar.value}</text>`,
    ].join("");
  }).join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="340" viewBox="0 0 ${width} 340">`,
    '<rect width="720" height="340" fill="#f9fafb"/>',
    '<text x="48" y="54" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#101828">Table formula integrity audit</text>',
    `<text x="48" y="88" font-size="18" font-family="Arial, sans-serif" fill="#344054">Decision: ${escapeXml(report.decision)} for ${escapeXml(report.documentId)}</text>`,
    `<g font-family="Arial, sans-serif">${bars}</g>`,
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
