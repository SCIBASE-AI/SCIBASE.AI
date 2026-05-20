"use strict";

const fs = require("fs");
const path = require("path");
const sampleContracts = require("./sample-data");
const { evaluatePortfolio, formatUsd } = require("./index");

const report = evaluatePortfolio(sampleContracts, { asOf: "2026-05-20" });
const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(path.join(reportsDir, "demo-output.json"), `${JSON.stringify(report, null, 2)}\n`);

function statusColor(status) {
  if (status === "amendment-review-needed") return "#b42318";
  if (status === "monitor") return "#b54708";
  return "#027a48";
}

function bar(width, value, max) {
  return Math.max(8, Math.round((value / max) * width));
}

const maxCommitted = Math.max(...report.contracts.map((contract) => contract.totals.committed));
const rows = report.contracts
  .map((contract, index) => {
    const y = 170 + index * 112;
    const consumedWidth = bar(420, contract.totals.consumed, maxCommitted);
    const projectedWidth = bar(420, contract.totals.projectedFinal, maxCommitted);
    const color = statusColor(contract.status);
    const topAction = contract.actions[0]?.action || "No action needed.";
    return `
      <g transform="translate(44 ${y})">
        <text x="0" y="0" class="customer">${contract.customer}</text>
        <text x="0" y="24" class="muted">${contract.recommendation} - score ${contract.revenueCertaintyScore}</text>
        <rect x="0" y="42" width="420" height="16" rx="8" fill="#e4e7ec" />
        <rect x="0" y="42" width="${projectedWidth}" height="16" rx="8" fill="#d0d5dd" />
        <rect x="0" y="42" width="${consumedWidth}" height="16" rx="8" fill="${color}" />
        <text x="440" y="55" class="metric">${formatUsd(contract.totals.consumed)} used / ${formatUsd(
          contract.totals.committed,
        )} committed</text>
        <text x="0" y="84" class="action">${topAction}</text>
      </g>`;
  })
  .join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Committed revenue drawdown guard demo</title>
  <desc id="desc">Portfolio status for institutional minimum commitments across subscription, compute, and analytics revenue.</desc>
  <style>
    .bg { fill: #f8fafc; }
    .panel { fill: #ffffff; stroke: #d0d5dd; stroke-width: 1; }
    .title { font: 700 34px Arial, sans-serif; fill: #101828; }
    .subtitle { font: 400 17px Arial, sans-serif; fill: #475467; }
    .label { font: 700 13px Arial, sans-serif; fill: #475467; text-transform: uppercase; }
    .number { font: 700 28px Arial, sans-serif; fill: #101828; }
    .customer { font: 700 20px Arial, sans-serif; fill: #101828; }
    .metric { font: 700 15px Arial, sans-serif; fill: #344054; }
    .muted { font: 400 14px Arial, sans-serif; fill: #667085; }
    .action { font: 400 15px Arial, sans-serif; fill: #344054; }
  </style>
  <rect class="bg" width="1280" height="720" />
  <rect class="panel" x="24" y="24" width="1232" height="672" rx="10" />
  <text x="44" y="72" class="title">Committed Revenue Drawdown Guard</text>
  <text x="44" y="104" class="subtitle">Institutional contract consumption, overage, credit-expiration, and amendment readiness as of ${report.asOf}</text>
  <g transform="translate(44 132)">
    <text class="label" x="0" y="0">Committed</text>
    <text class="number" x="0" y="34">${formatUsd(report.portfolio.committed)}</text>
    <text class="label" x="250" y="0">Consumed</text>
    <text class="number" x="250" y="34">${formatUsd(report.portfolio.consumed)}</text>
    <text class="label" x="500" y="0">At risk</text>
    <text class="number" x="500" y="34">${formatUsd(report.portfolio.atRisk)}</text>
    <text class="label" x="750" y="0">Expansion upside</text>
    <text class="number" x="750" y="34">${formatUsd(report.portfolio.expansionUpside)}</text>
  </g>
  ${rows}
  <text x="44" y="666" class="muted">Audit digest: ${report.auditDigest}</text>
</svg>
`;

fs.writeFileSync(path.join(reportsDir, "demo.svg"), svg);

console.log(`Contracts evaluated: ${report.portfolio.contractCount}`);
console.log(`Committed: ${formatUsd(report.portfolio.committed)}`);
console.log(`Consumed: ${formatUsd(report.portfolio.consumed)}`);
console.log(`At risk: ${formatUsd(report.portfolio.atRisk)}`);
console.log(`Expansion upside: ${formatUsd(report.portfolio.expansionUpside)}`);
console.log(`Top action: ${report.contracts[0].actions[0].action}`);
console.log(`Digest: ${report.auditDigest}`);
