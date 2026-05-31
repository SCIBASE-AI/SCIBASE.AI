"use strict";

const fs = require("fs");
const path = require("path");
const { analyzePriceEscalations, formatUsd } = require("./priceEscalationCapGuard");
const { sampleRenewals } = require("./sampleRenewals");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const packet = analyzePriceEscalations(sampleRenewals);
fs.writeFileSync(
  path.join(reportsDir, "price-escalation-packet.json"),
  JSON.stringify(packet, null, 2) + "\n",
);

const report = [
  "# Revenue Price Escalation Cap Guard",
  "",
  `Status: **${packet.status}**`,
  "",
  "## Summary",
  "",
  `- Renewals checked: ${packet.summary.renewals}`,
  `- Release: ${packet.summary.release}`,
  `- Review: ${packet.summary.review}`,
  `- Hold: ${packet.summary.hold}`,
  `- Current ARR reviewed: ${formatUsd(packet.summary.currentAnnualCents)}`,
  `- Proposed ARR reviewed: ${formatUsd(packet.summary.proposedAnnualCents)}`,
  "",
  "## Decisions",
  "",
  ...packet.decisions.map((item) => {
    const codes = item.findings.map((finding) => finding.code).join(", ") || "none";
    return `- ${item.renewalId}: ${item.decision} (${codes})`;
  }),
  "",
  "## Scope",
  "",
  "This guard supports SCIBASE revenue operations by holding or routing institutional renewal price escalations before invoice release when contract caps, CPI evidence, notice windows, price locks, or exception approvals need attention.",
  "",
].join("\n");

fs.writeFileSync(path.join(reportsDir, "price-escalation-report.md"), report);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#142026"/>
  <text x="56" y="78" fill="#ffffff" font-family="Arial" font-size="34" font-weight="700">Revenue price escalation cap guard</text>
  <text x="56" y="130" fill="#8bd3ff" font-family="Arial" font-size="24">Status: ${packet.status.toUpperCase()}</text>
  <rect x="56" y="178" width="190" height="118" rx="8" fill="#203442"/>
  <text x="86" y="228" fill="#ffffff" font-family="Arial" font-size="42">${packet.summary.renewals}</text>
  <text x="86" y="266" fill="#c7d7df" font-family="Arial" font-size="19">renewals checked</text>
  <rect x="276" y="178" width="190" height="118" rx="8" fill="#19382f"/>
  <text x="306" y="228" fill="#ffffff" font-family="Arial" font-size="42">${packet.summary.release}</text>
  <text x="306" y="266" fill="#bde4d7" font-family="Arial" font-size="19">release</text>
  <rect x="496" y="178" width="190" height="118" rx="8" fill="#3b3318"/>
  <text x="526" y="228" fill="#ffffff" font-family="Arial" font-size="42">${packet.summary.review}</text>
  <text x="526" y="266" fill="#f2dc92" font-family="Arial" font-size="19">review</text>
  <rect x="716" y="178" width="190" height="118" rx="8" fill="#3a1f27"/>
  <text x="746" y="228" fill="#ffffff" font-family="Arial" font-size="42">${packet.summary.hold}</text>
  <text x="746" y="266" fill="#f0b7c0" font-family="Arial" font-size="19">hold</text>
  <text x="56" y="370" fill="#dbe5ea" font-family="Arial" font-size="22">Checks contract uplift caps, CPI evidence, notice windows, price locks, and exception approvals.</text>
  <text x="56" y="416" fill="#dbe5ea" font-family="Arial" font-size="22">Proposed ARR reviewed: ${formatUsd(packet.summary.proposedAnnualCents)}</text>
</svg>
`;
fs.writeFileSync(path.join(reportsDir, "summary.svg"), svg);

console.log(report);
