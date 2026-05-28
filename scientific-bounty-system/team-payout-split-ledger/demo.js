"use strict";

const fs = require("node:fs");
const path = require("node:path");
const challenges = require("./data/challenges.json");
const { buildPayoutLedgers, summarizeLedgers } = require("./ledger");

const artifactDir = path.join(__dirname, "artifacts");
const ledgers = buildPayoutLedgers(challenges);
const summary = summarizeLedgers(ledgers);

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "payout-ledger.json"), `${JSON.stringify({ summary, ledgers }, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, "payout-ledger.md"), renderMarkdown(summary, ledgers));
fs.writeFileSync(path.join(artifactDir, "payout-flow.svg"), renderSvg(summary));

console.log(`reviewed ${summary.total} bounty payout ledgers`);
console.log(`payable=${summary.payable} blocked=${summary.blocked} held=${summary.held}`);

function renderMarkdown(reportSummary, ledgerRows) {
  const lines = [
    "# Team Payout Split Ledger",
    "",
    "## Summary",
    "",
    `- Challenges reviewed: ${reportSummary.total}`,
    `- Payable ledgers: ${reportSummary.payable}`,
    `- Blocked ledgers: ${reportSummary.blocked}`,
    `- Held ledgers: ${reportSummary.held}`,
    `- Unlocked funds: ${formatCurrency(reportSummary.unlockedCents)}`,
    `- Locked funds: ${formatCurrency(reportSummary.lockedCents)}`,
    "",
    "## Challenge Ledgers",
    "",
  ];

  for (const ledger of ledgerRows) {
    lines.push(`### ${ledger.challengeId}`);
    lines.push("");
    lines.push(`- Title: ${ledger.title}`);
    lines.push(`- Payable: ${ledger.payable}`);
    lines.push(`- Unlocked: ${formatCurrency(ledger.unlockedAmountCents)}`);
    lines.push(`- Locked: ${formatCurrency(ledger.lockedAmountCents)}`);
    lines.push(`- Receipt status: ${ledger.receipt.releaseStatus}`);
    for (const finding of ledger.findings) {
      lines.push(`  - ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(reportSummary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="250" role="img" aria-label="Team payout split ledger flow">
  <rect width="860" height="250" fill="#111827"/>
  <text x="32" y="44" fill="#f9fafb" font-family="Arial" font-size="22">Team Payout Split Ledger</text>
  <g font-family="Arial" font-size="14" fill="#e5e7eb">
    <rect x="34" y="88" width="190" height="76" rx="8" fill="#1f2937" stroke="#22c55e"/>
    <text x="58" y="118">Accepted milestones</text>
    <text x="58" y="140">release eligible funds</text>
    <path d="M224 126 H296" stroke="#9ca3af" stroke-width="2"/>
    <rect x="296" y="88" width="216" height="76" rx="8" fill="#1f2937" stroke="#38bdf8"/>
    <text x="322" y="116">Contributor splits</text>
    <text x="322" y="140">overhead and route checks</text>
    <path d="M512 126 H584" stroke="#9ca3af" stroke-width="2"/>
    <rect x="584" y="88" width="238" height="76" rx="8" fill="#1f2937" stroke="#f97316"/>
    <text x="612" y="116">Payable ${reportSummary.payable} / Blocked ${reportSummary.blocked}</text>
    <text x="612" y="140">Held ${reportSummary.held}, locked ${formatCurrency(reportSummary.lockedCents)}</text>
  </g>
</svg>
`;
}

function formatCurrency(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
