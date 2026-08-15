"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeIngestionPackets } = require("../src");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "sample_ingestion_packets.json");
const outDir = path.join(root, "reports");
const packets = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const report = analyzeIngestionPackets(packets);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Paper Ingestion Quality Gate Report",
  "",
  `Generated: ${report.generatedAt}`,
  `Packets analyzed: ${report.totalPackets}`,
  `Decision counts: SUMMARIZE ${report.counts.SUMMARIZE}, REVIEW ${report.counts.REVIEW}, HOLD ${report.counts.HOLD}`,
  "",
  "## Findings",
  "",
  ...report.results.flatMap((item) => [
    `### ${item.id}: ${item.title}`,
    "",
    `Decision: ${item.decision}`,
    `Completeness: ${item.completeness}`,
    "",
    item.findings.length === 0
      ? "- No intake quality risk detected."
      : item.findings.map((finding) => `- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`).join("\n"),
    "",
    "Recommended actions:",
    ...item.recommendedActions.map((action) => `- ${action}`),
    ""
  ])
].join("\n");

fs.writeFileSync(path.join(outDir, "reviewer-packet.md"), markdown);

const total = Math.max(1, report.totalPackets);
const maxBar = 620;
const holdWidth = Math.round((report.counts.HOLD / total) * maxBar);
const reviewWidth = Math.round((report.counts.REVIEW / total) * maxBar);
const summarizeWidth = Math.round((report.counts.SUMMARIZE / total) * maxBar);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
  <rect width="900" height="520" fill="#f8faf8"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#18211d">Paper Ingestion Quality Gate</text>
  <text x="56" y="118" font-family="Arial, sans-serif" font-size="19" fill="#3d4b44">Synthetic AI summarizer intake audit before key findings are generated.</text>
  <text x="56" y="180" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#18211d">Decision distribution</text>
  <text x="56" y="235" font-family="Arial, sans-serif" font-size="20" fill="#18211d">HOLD</text>
  <rect x="180" y="212" width="${holdWidth}" height="32" rx="4" fill="#cf3f45"/>
  <text x="${190 + holdWidth}" y="235" font-family="Arial, sans-serif" font-size="18" fill="#18211d">${report.counts.HOLD}</text>
  <text x="56" y="295" font-family="Arial, sans-serif" font-size="20" fill="#18211d">REVIEW</text>
  <rect x="180" y="272" width="${reviewWidth}" height="32" rx="4" fill="#e0a12b"/>
  <text x="${190 + reviewWidth}" y="295" font-family="Arial, sans-serif" font-size="18" fill="#18211d">${report.counts.REVIEW}</text>
  <text x="56" y="355" font-family="Arial, sans-serif" font-size="20" fill="#18211d">SUMMARIZE</text>
  <rect x="180" y="332" width="${summarizeWidth}" height="32" rx="4" fill="#2d7d5f"/>
  <text x="${190 + summarizeWidth}" y="355" font-family="Arial, sans-serif" font-size="18" fill="#18211d">${report.counts.SUMMARIZE}</text>
  <text x="56" y="430" font-family="Arial, sans-serif" font-size="18" fill="#3d4b44">Flags page drops, missing sections, OCR noise, table/caption gaps, reference failures, and unsafe summarizer release.</text>
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
