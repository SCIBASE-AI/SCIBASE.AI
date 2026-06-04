"use strict";

const fs = require("node:fs");
const path = require("node:path");
const scenarios = require("./fixtures/scenarios.json");
const { centsToDollars, evaluatePortfolio } = require("./guard");

const outputDir = path.join(__dirname, "artifacts");
fs.mkdirSync(outputDir, { recursive: true });

const result = evaluatePortfolio(scenarios);
const jsonPath = path.join(outputDir, "demo-output.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);

const rows = result.accounts
  .map((account) => {
    const findings = account.findings.map((finding) => finding.code).join(", ") || "none";
    return `| ${account.accountId} | ${account.action} | $${centsToDollars(account.netInvoiceCents).toFixed(2)} | $${centsToDollars(account.atRiskCents).toFixed(2)} | ${findings} |`;
  })
  .join("\n");

const report = [
  "# Trial/Coupon/Consortium Pricing Guard Report",
  "",
  `Invoice date: ${result.summary.invoiceDate}`,
  "",
  "## Portfolio Summary",
  "",
  `- Accounts evaluated: ${result.summary.accountCount}`,
  `- Released invoices: ${result.summary.releaseCount}`,
  `- Review holds: ${result.summary.reviewCount}`,
  `- Blocked invoices: ${result.summary.holdCount}`,
  `- Net invoice amount: $${result.summary.totalNetInvoiceDollars.toFixed(2)}`,
  `- Discount risk detected: $${result.summary.totalAtRiskDollars.toFixed(2)}`,
  "",
  "## Account Decisions",
  "",
  "| Account | Action | Net invoice | At risk | Finding codes |",
  "| --- | --- | ---: | ---: | --- |",
  rows,
  "",
  "## Revenue Infrastructure Mapping",
  "",
  "- Tiered subscription billing: checks plan-level coupon eligibility, billing cycle discounts, and seat-volume conflicts.",
  "- Free trials and coupons: blocks reused trials, expired coupons, missing trial-conversion evidence, and non-stackable coupon combinations.",
  "- Consortium pricing: verifies institution/domain/seat eligibility before discount release.",
  "- Invoice safety: emits deterministic RELEASE_INVOICE, REVIEW_BEFORE_RELEASE, or HOLD_INVOICE actions before billing leaves the platform.",
  "- Privacy: uses synthetic fixtures only; no payment processor calls, customer identifiers, credentials, or external APIs.",
  ""
].join("\n");

fs.writeFileSync(path.join(outputDir, "reviewer-report.md"), report);

const barWidth = 620;
const barHeight = 34;
const maxRisk = Math.max(...result.accounts.map((account) => account.atRiskCents), 1);
const bars = result.accounts.map((account, index) => {
  const width = Math.round((account.atRiskCents / maxRisk) * barWidth);
  const y = 80 + index * 58;
  const color = account.action === "RELEASE_INVOICE" ? "#16a34a" : account.action === "REVIEW_BEFORE_RELEASE" ? "#f59e0b" : "#dc2626";
  return [
    `<text x="36" y="${y - 10}" font-family="Arial" font-size="16" fill="#111827">${account.accountId}</text>`,
    `<rect x="36" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="#e5e7eb"/>`,
    `<rect x="36" y="${y}" width="${Math.max(width, account.atRiskCents > 0 ? 8 : 0)}" height="${barHeight}" rx="4" fill="${color}"/>`,
    `<text x="${barWidth + 56}" y="${y + 23}" font-family="Arial" font-size="15" fill="#111827">$${centsToDollars(account.atRiskCents).toFixed(2)} at risk</text>`
  ].join("\n");
}).join("\n");

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${150 + result.accounts.length * 58}" viewBox="0 0 900 ${150 + result.accounts.length * 58}">`,
  '<rect width="100%" height="100%" fill="#f8fafc"/>',
  '<text x="36" y="42" font-family="Arial" font-size="26" font-weight="700" fill="#111827">Revenue discount risk map</text>',
  `<text x="36" y="66" font-family="Arial" font-size="15" fill="#475569">Blocked invoices: ${result.summary.holdCount} | Review: ${result.summary.reviewCount} | Total at risk: $${result.summary.totalAtRiskDollars.toFixed(2)}</text>`,
  bars,
  "</svg>"
].join("\n");

fs.writeFileSync(path.join(outputDir, "discount-risk-map.svg"), svg);

console.log(`Wrote ${jsonPath}`);
console.log(report);
