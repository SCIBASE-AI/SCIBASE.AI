"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzePackets } = require("../src");

const root = path.resolve(__dirname, "..");
const packets = JSON.parse(fs.readFileSync(path.join(root, "data", "sample_submission_packets.json"), "utf8"));
const report = analyzePackets(packets);
const outDir = path.join(root, "reports");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "reviewer-packet.md"), renderMarkdown(report));
fs.writeFileSync(path.join(outDir, "summary.svg"), renderSvg(report));

console.log(JSON.stringify({
  packetCount: report.packetCount,
  decisionCounts: report.decisionCounts,
  reports: [
    "reports/summary.json",
    "reports/reviewer-packet.md",
    "reports/summary.svg"
  ]
}, null, 2));

function renderMarkdown(report) {
  const lines = [
    "# Bounty AI Assistance Disclosure Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Decision Counts",
    "",
    `- RELEASE: ${report.decisionCounts.RELEASE}`,
    `- REVIEW: ${report.decisionCounts.REVIEW}`,
    `- HOLD: ${report.decisionCounts.HOLD}`,
    "",
    "## Packet Reviews",
    ""
  ];

  for (const review of report.reviews) {
    lines.push(`### ${review.title}`);
    lines.push(`Challenge: ${review.challenge}`);
    lines.push(`Decision: ${review.decision}`);
    lines.push(`Confidence: ${review.confidence}`);
    lines.push(`AI used: ${review.aiUsed}`);
    lines.push(`Generated components: ${review.componentCount}`);
    lines.push(`Reviewer note: ${review.reviewerNote}`);
    for (const item of review.findings) {
      lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}`);
      lines.push(`  Remediation: ${item.remediation}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(report) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="380" viewBox="0 0 960 380" role="img" aria-label="Bounty AI assistance disclosure guard summary">
  <rect width="960" height="380" fill="#f8faf9"/>
  <text x="48" y="60" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800" fill="#17201c">Bounty AI Assistance Disclosure</text>
  <text x="48" y="96" font-family="Inter, Arial, sans-serif" font-size="16" fill="#56655e">Disclosure, approved tools, human review, provenance hashes, private-data leakage, and license fit.</text>
  ${bar("RELEASE", report.decisionCounts.RELEASE, 48, 148, "#36af8f")}
  ${bar("REVIEW", report.decisionCounts.REVIEW, 48, 218, "#d4a235")}
  ${bar("HOLD", report.decisionCounts.HOLD, 48, 288, "#d65d73")}
</svg>`;
}

function bar(label, count, x, y, color) {
  const width = 96 + count * 116;
  return `<text x="${x}" y="${y - 13}" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700" fill="#17201c">${label}: ${count}</text>
  <rect x="${x}" y="${y}" width="${width}" height="34" rx="6" fill="${color}"/>
  <rect x="${x}" y="${y}" width="800" height="34" rx="6" fill="none" stroke="#d7e1dc"/>`;
}
