"use strict";

const fs = require("fs");
const path = require("path");
const { analyzeManuscript, renderMarkdownReview } = require("./index");
const { neuroCalmManuscript } = require("./sample-data");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(report) {
  const maxBar = 760;
  const criticalWidth = Math.round((report.summary.criticalFindings / Math.max(1, report.findings.length)) * maxBar);
  const highWidth = Math.round((report.summary.highFindings / Math.max(1, report.findings.length)) * maxBar);
  const unsupportedWidth = Math.round(
    (report.summary.unsupportedOrContradictedClaims / Math.max(1, report.summary.claimsReviewed)) * maxBar
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-label="Citation grounding review summary">
  <rect width="1200" height="720" fill="#07111f"/>
  <rect x="52" y="52" width="1096" height="616" rx="18" fill="#101c2f" stroke="#29415f"/>
  <text x="86" y="118" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Citation Claim Grounding Review</text>
  <text x="86" y="166" fill="#b9c8dd" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.manuscript.title)}</text>
  <text x="86" y="236" fill="#ffcf5a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Decision: ${escapeXml(report.summary.decision)}</text>
  <text x="86" y="286" fill="#ffffff" font-family="Arial, sans-serif" font-size="28">Risk score ${report.summary.riskScore} / 100</text>
  <g font-family="Arial, sans-serif" font-size="22" fill="#d9e5f5">
    <text x="86" y="372">Critical findings</text>
    <rect x="340" y="348" width="${criticalWidth}" height="34" fill="#ff6b6b"/>
    <text x="${360 + criticalWidth}" y="372">${report.summary.criticalFindings}</text>
    <text x="86" y="432">High findings</text>
    <rect x="340" y="408" width="${highWidth}" height="34" fill="#ffa94d"/>
    <text x="${360 + highWidth}" y="432">${report.summary.highFindings}</text>
    <text x="86" y="492">Unsupported or contradicted claims</text>
    <rect x="340" y="468" width="${unsupportedWidth}" height="34" fill="#7cc4ff"/>
    <text x="${360 + unsupportedWidth}" y="492">${report.summary.unsupportedOrContradictedClaims}/${report.summary.claimsReviewed}</text>
  </g>
  <text x="86" y="592" fill="#90a9c7" font-family="Arial, sans-serif" font-size="18">Audit digest ${report.summary.auditDigest}</text>
</svg>
`;
}

function main() {
  const report = analyzeManuscript(neuroCalmManuscript, { currentYear: 2026 });
  const reportsDir = path.join(__dirname, "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(path.join(reportsDir, "citation-grounding-review.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(reportsDir, "citation-grounding-review.md"), renderMarkdownReview(report));
  fs.writeFileSync(path.join(reportsDir, "citation-grounding-summary.svg"), renderSvgSummary(report));

  console.log(
    `decision=${report.summary.decision} riskScore=${report.summary.riskScore} findings=${report.findings.length}`
  );
  console.log(`reports=${reportsDir}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  renderSvgSummary,
};
