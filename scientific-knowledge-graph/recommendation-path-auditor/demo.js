"use strict";

const fs = require("fs");
const path = require("path");
const { auditRecommendations, renderMarkdownReport } = require("./index");
const { recommendationPacket } = require("./sample-data");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvg(report) {
  const maxWidth = 720;
  const riskWidth = Math.round((report.summary.riskScore / 100) * maxWidth);
  const criticalWidth = Math.round((report.summary.criticalFindings / report.summary.findings) * maxWidth);
  const highWidth = Math.round((report.summary.highFindings / report.summary.findings) * maxWidth);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-label="Recommendation path audit summary">
  <rect width="1200" height="720" fill="#07111f"/>
  <rect x="56" y="52" width="1088" height="616" rx="18" fill="#101c2f" stroke="#29415f"/>
  <text x="88" y="116" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Recommendation Path Audit</text>
  <text x="88" y="164" fill="#b9c8dd" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.graph.title)}</text>
  <text x="88" y="232" fill="#ffcf5a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Decision: ${escapeXml(report.summary.decision)}</text>
  <g font-family="Arial, sans-serif" font-size="22" fill="#d9e5f5">
    <text x="88" y="332">Audit risk</text>
    <rect x="390" y="308" width="${maxWidth}" height="34" fill="#273854"/>
    <rect x="390" y="308" width="${riskWidth}" height="34" fill="#ff6b6b"/>
    <text x="88" y="392">Critical findings</text>
    <rect x="390" y="368" width="${maxWidth}" height="34" fill="#273854"/>
    <rect x="390" y="368" width="${criticalWidth}" height="34" fill="#ffa94d"/>
    <text x="88" y="452">High findings</text>
    <rect x="390" y="428" width="${maxWidth}" height="34" fill="#273854"/>
    <rect x="390" y="428" width="${highWidth}" height="34" fill="#7cc4ff"/>
  </g>
  <text x="88" y="548" fill="#d9e5f5" font-family="Arial, sans-serif" font-size="22">${report.summary.nodesReviewed} nodes • ${report.summary.edgesReviewed} edges • ${report.summary.recommendationsReviewed} recommendations</text>
  <text x="88" y="620" fill="#90a9c7" font-family="Arial, sans-serif" font-size="18">Audit digest ${report.summary.auditDigest}</text>
</svg>
`;
}

function main() {
  const report = auditRecommendations(recommendationPacket);
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, "recommendation-path-audit.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportsDir, "recommendation-path-audit.md"), renderMarkdownReport(report));
  fs.writeFileSync(path.join(reportsDir, "recommendation-path-summary.svg"), renderSvg(report));
  console.log(`decision=${report.summary.decision} riskScore=${report.summary.riskScore} findings=${report.summary.findings}`);
  console.log(`reports=${reportsDir}`);
}

if (require.main === module) {
  main();
}

module.exports = { renderSvg };
