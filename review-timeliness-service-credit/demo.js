"use strict";

const fs = require("fs");
const path = require("path");
const { createServiceCreditPacket } = require("./index");
const { reviewLedger } = require("./sample-data");

function ensureReportsDir() {
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

function renderMarkdown(packet) {
  const lines = [
    "# Review Timeliness Service-Credit Packet",
    "",
    `Project: ${packet.projectId}`,
    `Privacy mode: ${packet.privacyMode}`,
    `Scoring window: ${packet.scoringWindowDays} days`,
    "",
    "## Reviewer Results",
    ...packet.reviewers.map((reviewer) => `- ${reviewer.displayName}: ${reviewer.averageCredit} (${reviewer.serviceTier})`),
    "",
    "## Holds",
    ...packet.reviewerActions.map((action) => `- ${action.reviewerId}: ${action.hold} -> ${action.action}`),
    "",
    "## Transparency Receipt",
    `Included signals: ${packet.transparencyReceipt.includedSignals.join(", ")}`,
    `Excluded signals: ${packet.transparencyReceipt.excludedSignals.join(", ")}`,
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function renderSvg(packet) {
  const rows = packet.reviewers.map((reviewer, index) => {
    const y = 170 + index * 82;
    const width = Math.round(reviewer.averageCredit * 4.6);
    const color = reviewer.holds.includes("blind-review-privacy-hold") ? "#b33f62" : "#247c7a";
    return `
      <text x="48" y="${y}" font-size="20" fill="#17324d">${reviewer.displayName}</text>
      <text x="48" y="${y + 26}" font-size="15" fill="#496272">${reviewer.serviceTier}</text>
      <rect x="270" y="${y - 18}" width="460" height="30" rx="6" fill="#dbe7ee"/>
      <rect x="270" y="${y - 18}" width="${width}" height="30" rx="6" fill="${color}"/>
      <text x="620" y="${y + 5}" font-size="17" fill="#17324d">${reviewer.averageCredit}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="460" viewBox="0 0 800 460">
    <rect width="800" height="460" fill="#f7fbfb"/>
    <rect x="24" y="24" width="752" height="412" rx="14" fill="#ffffff" stroke="#c7d9d6"/>
    <text x="48" y="76" font-size="28" font-family="Arial, sans-serif" font-weight="700" fill="#17324d">Review timeliness service credit</text>
    <text x="48" y="108" font-size="17" font-family="Arial, sans-serif" fill="#496272">Transparent service-credit guard for ${packet.privacyMode} review</text>
    <g font-family="Arial, sans-serif">${rows}</g>
    <text x="48" y="398" font-size="15" font-family="Arial, sans-serif" fill="#496272">Holds: ${packet.reviewerActions.length}; leaderboard-ready reviewers: ${packet.leaderboardReady.length}</text>
  </svg>`;
}

function runDemo() {
  const packet = createServiceCreditPacket(reviewLedger);
  const reportsDir = ensureReportsDir();
  fs.writeFileSync(path.join(reportsDir, "service-credit-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "service-credit-packet.md"), renderMarkdown(packet));
  fs.writeFileSync(path.join(reportsDir, "service-credit-summary.svg"), renderSvg(packet));
  return packet;
}

if (require.main === module) {
  const packet = runDemo();
  console.log(JSON.stringify({
    reviewers: packet.reviewers.length,
    holds: packet.reviewerActions.length,
    leaderboardReady: packet.leaderboardReady.length,
  }, null, 2));
}

module.exports = { runDemo, renderMarkdown, renderSvg };
