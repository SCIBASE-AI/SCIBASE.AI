"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeIdentityMergePackets } = require("../src/index.js");

const root = path.resolve(__dirname, "..");
const packets = JSON.parse(
  fs.readFileSync(path.join(root, "data", "sample-merge-packets.json"), "utf8")
);
const analysis = analyzeIdentityMergePackets(packets);
const outDir = path.join(root, "reports");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "summary.json"), `${JSON.stringify(analysis, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "reviewer-packet.md"), renderMarkdown(analysis));
fs.writeFileSync(path.join(outDir, "summary.svg"), renderSvg(analysis));

console.log(JSON.stringify({
  packets: analysis.summary.totalPackets,
  decisions: analysis.summary.decisions,
  outDir
}, null, 2));

function renderMarkdown({ summary, results }) {
  const lines = [
    "# Researcher Identity Merge Guard Reviewer Packet",
    "",
    "Synthetic SCIBASE community reputation packets were evaluated before identity consolidation could transfer credit, reputation, badges, or private review history.",
    "",
    "## Decision Summary",
    "",
    `- Total packets: ${summary.totalPackets}`,
    `- Approve: ${summary.decisions.APPROVE_MERGE}`,
    `- Review: ${summary.decisions.REVIEW_MERGE}`,
    `- Hold: ${summary.decisions.HOLD_MERGE}`,
    "",
    "## Packet Findings",
    ""
  ];

  for (const result of results) {
    lines.push(`### ${result.packetId}: ${result.decision}`);
    lines.push("");
    lines.push(`- Verified proof types: ${result.verifiedProofTypes.join(", ") || "none"}`);
    lines.push(`- Projected credit delta: ${result.projectedCreditDelta}`);
    if (result.findings.length === 0) {
      lines.push("- Findings: none");
    } else {
      lines.push("- Findings:");
      for (const finding of result.findings) {
        lines.push(`  - ${finding.code} (${finding.severity}): ${finding.message}`);
      }
    }
    lines.push("- Reviewer actions:");
    for (const action of result.reviewerActions) {
      lines.push(`  - ${action}`);
    }
    lines.push("");
  }

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return `${lines.join("\n")}\n`;
}

function renderSvg({ summary }) {
  const total = Math.max(1, summary.totalPackets);
  const approveWidth = Math.round((summary.decisions.APPROVE_MERGE / total) * 740);
  const reviewWidth = Math.round((summary.decisions.REVIEW_MERGE / total) * 740);
  const holdWidth = Math.round((summary.decisions.HOLD_MERGE / total) * 740);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Researcher identity merge guard summary">
  <rect width="960" height="540" fill="#fbfaf6"/>
  <text x="70" y="78" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#111827">Researcher Identity Merge Guard</text>
  <text x="70" y="121" font-family="Arial, sans-serif" font-size="19" fill="#374151">Blocks reputation and credit transfer until identity, consent, privacy, and audit evidence align.</text>
  <rect x="70" y="170" width="${approveWidth}" height="54" rx="8" fill="#2f855a"/>
  <rect x="70" y="248" width="${reviewWidth}" height="54" rx="8" fill="#b7791f"/>
  <rect x="70" y="326" width="${holdWidth}" height="54" rx="8" fill="#c53030"/>
  <text x="70" y="158" font-family="Arial, sans-serif" font-size="18" fill="#111827">Approve merge: ${summary.decisions.APPROVE_MERGE}</text>
  <text x="70" y="236" font-family="Arial, sans-serif" font-size="18" fill="#111827">Review merge: ${summary.decisions.REVIEW_MERGE}</text>
  <text x="70" y="314" font-family="Arial, sans-serif" font-size="18" fill="#111827">Hold merge: ${summary.decisions.HOLD_MERGE}</text>
  <text x="70" y="448" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#111827">Synthetic packets only</text>
  <text x="70" y="482" font-family="Arial, sans-serif" font-size="18" fill="#374151">No credentials, external APIs, desktop capture, or private researcher data.</text>
</svg>
`;
}
