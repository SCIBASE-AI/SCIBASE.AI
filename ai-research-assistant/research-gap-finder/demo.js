"use strict";

const fs = require("fs");
const path = require("path");
const { findResearchGaps, renderMarkdownReport } = require("./index");
const { neuroInflammationCorpus } = require("./sample-data");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvg(report) {
  const maxWidth = 720;
  const top = report.opportunities[0];
  const second = report.opportunities[1];
  const third = report.opportunities[2];
  const topWidth = Math.round((top.score / report.summary.topScore) * maxWidth);
  const secondWidth = Math.round((second.score / report.summary.topScore) * maxWidth);
  const thirdWidth = Math.round((third.score / report.summary.topScore) * maxWidth);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-label="Research gap finder summary">
  <rect width="1200" height="720" fill="#07111f"/>
  <rect x="56" y="52" width="1088" height="616" rx="18" fill="#101c2f" stroke="#29415f"/>
  <text x="88" y="116" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Research Gap Finder</text>
  <text x="88" y="164" fill="#b9c8dd" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.corpus.title)}</text>
  <text x="88" y="230" fill="#ffcf5a" font-family="Arial, sans-serif" font-size="32" font-weight="700">${report.summary.opportunitiesFound} ranked opportunities found</text>
  <g font-family="Arial, sans-serif" font-size="20" fill="#d9e5f5">
    <text x="88" y="330">${escapeXml(top.key)}</text>
    <rect x="88" y="348" width="${topWidth}" height="30" fill="#ff6b6b"/>
    <text x="88" y="424">${escapeXml(second.key)}</text>
    <rect x="88" y="442" width="${secondWidth}" height="30" fill="#ffa94d"/>
    <text x="88" y="518">${escapeXml(third.key)}</text>
    <rect x="88" y="536" width="${thirdWidth}" height="30" fill="#7cc4ff"/>
  </g>
  <text x="88" y="620" fill="#90a9c7" font-family="Arial, sans-serif" font-size="18">Audit digest ${report.summary.auditDigest}</text>
</svg>
`;
}

function main() {
  const report = findResearchGaps(neuroInflammationCorpus, {
    currentYear: 2026,
    targetTopics: ["microglia", "wearables", "digital biomarkers"],
    minIntersectionSize: 2,
    maxIntersectionSize: 3,
    limit: 8,
  });
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, "research-gap-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportsDir, "research-gap-report.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportsDir, "research-gap-summary.svg"), renderSvg(report));
  console.log(`opportunities=${report.summary.opportunitiesFound} topScore=${report.summary.topScore}`);
  console.log(`reports=${reportsDir}`);
}

if (require.main === module) {
  main();
}

module.exports = { renderSvg };
