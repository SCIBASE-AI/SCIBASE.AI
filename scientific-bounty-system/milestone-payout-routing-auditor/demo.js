"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeChallengePayout, renderMarkdownReport, centsToUsd } = require("./index");
const { biomarkerChallenge } = require("./sample-data");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvg(report) {
  const maxWidth = 680;
  const escrowWidth = Math.round((report.summary.escrowedCents / report.summary.requiredEscrowCents) * maxWidth);
  const milestoneWidth = Math.round((report.summary.milestoneTotalCents / report.summary.prizeCents) * maxWidth);
  const splitWidth = Math.round((report.summary.splitTotal / 100) * maxWidth);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-label="Milestone payout routing audit">
  <rect width="1200" height="720" fill="#07111f"/>
  <rect x="56" y="52" width="1088" height="616" rx="18" fill="#101c2f" stroke="#29415f"/>
  <text x="88" y="116" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Milestone Payout Routing Audit</text>
  <text x="88" y="164" fill="#b9c8dd" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.challenge.title)}</text>
  <text x="88" y="232" fill="#ffcf5a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Decision: ${escapeXml(report.summary.decision)}</text>
  <text x="88" y="286" fill="#ffffff" font-family="Arial, sans-serif" font-size="28">Risk score ${report.summary.riskScore} / 100</text>
  <g font-family="Arial, sans-serif" font-size="22" fill="#d9e5f5">
    <text x="88" y="372">Escrow coverage</text>
    <rect x="360" y="348" width="${maxWidth}" height="34" fill="#273854"/>
    <rect x="360" y="348" width="${escrowWidth}" height="34" fill="#ff6b6b"/>
    <text x="88" y="432">Milestone total</text>
    <rect x="360" y="408" width="${maxWidth}" height="34" fill="#273854"/>
    <rect x="360" y="408" width="${milestoneWidth}" height="34" fill="#ffa94d"/>
    <text x="88" y="492">Team split total</text>
    <rect x="360" y="468" width="${maxWidth}" height="34" fill="#273854"/>
    <rect x="360" y="468" width="${splitWidth}" height="34" fill="#7cc4ff"/>
  </g>
  <text x="88" y="568" fill="#d9e5f5" font-family="Arial, sans-serif" font-size="22">Prize ${centsToUsd(report.summary.prizeCents)} • Escrowed ${centsToUsd(report.summary.escrowedCents)}</text>
  <text x="88" y="616" fill="#90a9c7" font-family="Arial, sans-serif" font-size="18">Audit digest ${report.summary.auditDigest}</text>
</svg>
`;
}

function main() {
  const report = analyzeChallengePayout(biomarkerChallenge);
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, "payout-routing-audit.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportsDir, "payout-routing-audit.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportsDir, "payout-routing-summary.svg"), renderSvg(report));
  console.log(`decision=${report.summary.decision} riskScore=${report.summary.riskScore} findings=${report.summary.findings}`);
  console.log(`reports=${reportsDir}`);
}

if (require.main === module) {
  main();
}

module.exports = { renderSvg };
