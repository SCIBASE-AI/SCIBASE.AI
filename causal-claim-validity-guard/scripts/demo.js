"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzePackets } = require("../src");

const root = path.resolve(__dirname, "..");
const packets = JSON.parse(fs.readFileSync(path.join(root, "data", "sample_review_packets.json"), "utf8"));
const report = analyzePackets(packets);
const outDir = path.join(root, "artifacts");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "causal-claim-review.json"), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "causal-claim-review.md"), renderMarkdown(report));
fs.writeFileSync(path.join(outDir, "causal-claim-summary.svg"), renderSvg(report));

console.log(JSON.stringify({
  packetCount: report.packetCount,
  decisionCounts: report.decisionCounts,
  artifacts: [
    "artifacts/causal-claim-review.json",
    "artifacts/causal-claim-review.md",
    "artifacts/causal-claim-summary.svg"
  ]
}, null, 2));

function renderMarkdown(report) {
  const lines = [
    "# Causal Claim Validity Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Decision Counts",
    "",
    `- RELEASE: ${report.decisionCounts.RELEASE}`,
    `- REVISE: ${report.decisionCounts.REVISE}`,
    `- HOLD: ${report.decisionCounts.HOLD}`,
    "",
    "## Packet Reviews",
    ""
  ];

  for (const review of report.reviews) {
    lines.push(`### ${review.title}`);
    lines.push(`Decision: ${review.decision}`);
    lines.push(`Confidence: ${review.confidence}`);
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
  const hold = report.decisionCounts.HOLD;
  const revise = report.decisionCounts.REVISE;
  const release = report.decisionCounts.RELEASE;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360" role="img" aria-label="Causal claim validity guard summary">
  <rect width="900" height="360" fill="#f8faf7"/>
  <text x="48" y="62" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800" fill="#17201c">Causal Claim Validity Guard</text>
  <text x="48" y="98" font-family="Inter, Arial, sans-serif" font-size="16" fill="#647067">AI peer-review gate for causal language, design support, comparator evidence, and uncertainty.</text>
  ${bar("RELEASE", release, 48, 148, "#4fbf9f")}
  ${bar("REVISE", revise, 48, 214, "#d6a137")}
  ${bar("HOLD", hold, 48, 280, "#d85f73")}
</svg>`;
}

function bar(label, count, x, y, color) {
  const width = 96 + count * 110;
  return `<text x="${x}" y="${y - 12}" font-family="Inter, Arial, sans-serif" font-size="15" font-weight="700" fill="#17201c">${label}: ${count}</text>
  <rect x="${x}" y="${y}" width="${width}" height="30" rx="6" fill="${color}"/>
  <rect x="${x}" y="${y}" width="760" height="30" rx="6" fill="none" stroke="#d9e2dc"/>`;
}
