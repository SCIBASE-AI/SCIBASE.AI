"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeEntitlementDeliveryPackets } = require("../src");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "sample_entitlement_delivery_packets.json");
const outDir = path.join(root, "reports");
const packets = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const report = analyzeEntitlementDeliveryPackets(packets);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  "# Revenue Entitlement Delivery Guard Report",
  "",
  `Generated: ${report.generatedAt}`,
  `Contract packets analyzed: ${report.totalPackets}`,
  `Decision counts: RELEASE_REVENUE ${report.counts.RELEASE_REVENUE}, REVIEW_REVENUE ${report.counts.REVIEW_REVENUE}, HOLD_REVENUE ${report.counts.HOLD_REVENUE}`,
  "",
  "## Findings",
  "",
  ...report.results.flatMap((item) => [
    `### ${item.id}: ${item.title}`,
    "",
    `Decision: ${item.decision}`,
    `Account: ${item.accountId || "not declared"}`,
    "",
    item.findings.length === 0
      ? "- No entitlement delivery risk detected."
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
const holdWidth = Math.round((report.counts.HOLD_REVENUE / total) * maxBar);
const reviewWidth = Math.round((report.counts.REVIEW_REVENUE / total) * maxBar);
const releaseWidth = Math.round((report.counts.RELEASE_REVENUE / total) * maxBar);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
  <rect width="900" height="520" fill="#fbfaf6"/>
  <text x="56" y="76" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#1e221c">Revenue Entitlement Delivery Guard</text>
  <text x="56" y="118" font-family="Arial, sans-serif" font-size="19" fill="#4b5144">Synthetic contract-to-provisioning audit before billing, renewal, or revenue recognition.</text>
  <text x="56" y="180" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#1e221c">Decision distribution</text>
  <text x="56" y="235" font-family="Arial, sans-serif" font-size="20" fill="#1e221c">HOLD</text>
  <rect x="180" y="212" width="${holdWidth}" height="32" rx="4" fill="#c74d42"/>
  <text x="${190 + holdWidth}" y="235" font-family="Arial, sans-serif" font-size="18" fill="#1e221c">${report.counts.HOLD_REVENUE}</text>
  <text x="56" y="295" font-family="Arial, sans-serif" font-size="20" fill="#1e221c">REVIEW</text>
  <rect x="180" y="272" width="${reviewWidth}" height="32" rx="4" fill="#d4a235"/>
  <text x="${190 + reviewWidth}" y="295" font-family="Arial, sans-serif" font-size="18" fill="#1e221c">${report.counts.REVIEW_REVENUE}</text>
  <text x="56" y="355" font-family="Arial, sans-serif" font-size="20" fill="#1e221c">RELEASE</text>
  <rect x="180" y="332" width="${releaseWidth}" height="32" rx="4" fill="#3b7f5a"/>
  <text x="${190 + releaseWidth}" y="355" font-family="Arial, sans-serif" font-size="18" fill="#1e221c">${report.counts.RELEASE_REVENUE}</text>
  <text x="56" y="430" font-family="Arial, sans-serif" font-size="18" fill="#4b5144">Checks delivery evidence, acceptance, seats, quotas, feeds, support tier, contract term, and revenue holds.</text>
  <text x="56" y="468" font-family="Arial, sans-serif" font-size="16" fill="#6a7161">Synthetic generated artifact only. No desktop capture or private data.</text>
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
