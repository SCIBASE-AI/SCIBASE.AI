const fs = require("node:fs");
const path = require("node:path");
const { evaluateSystematicReviewScreening } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const clean = evaluateSystematicReviewScreening(cleanPacket);
const risky = evaluateSystematicReviewScreening(riskyPacket);

function writeJson(name, value) {
  fs.writeFileSync(path.join(reportsDir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function makeMarkdownReport(report) {
  const lines = [
    `# Screening Assistant Handoff: ${report.summary.reviewId}`,
    "",
    `Decision: ${report.summary.decision}`,
    `Findings: ${report.summary.findingCount}`,
    `High or critical findings: ${report.summary.highOrCriticalFindings}`,
    `Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Required Actions"
  ];

  if (report.recommendations.length === 0) {
    lines.push("- No remediation required.");
  } else {
    for (const recommendation of report.recommendations) {
      lines.push(`- ${recommendation}`);
    }
  }

  lines.push("", "## Top Findings");
  for (const finding of report.findings.slice(0, 8)) {
    lines.push(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
  }

  return `${lines.join("\n")}\n`;
}

function makeSvg(cleanReport, riskyReport) {
  const cleanWidth = 280;
  const riskyWidth = Math.min(560, 36 * riskyReport.summary.findingCount);
  const criticalWidth = Math.min(560, 72 * riskyReport.summary.criticalFindings);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="58" y="52" width="844" height="436" rx="6" fill="#ffffff" stroke="#cbd5e1"/>
  <rect x="58" y="52" width="844" height="10" fill="#0f172a"/>
  <text x="92" y="108" font-family="Arial" font-size="28" fill="#0f172a">Systematic Review Screening Drift Assistant</text>
  <text x="92" y="144" font-family="Arial" font-size="15" fill="#475569">Eligibility version locks, dual review, exclusion evidence, AI authority, and gap prompt safety.</text>
  <text x="92" y="204" font-family="Arial" font-size="17" fill="#0f172a">Clean packet</text>
  <rect x="92" y="222" width="560" height="34" fill="#e2e8f0"/>
  <rect x="92" y="222" width="${cleanWidth}" height="34" fill="#10b981"/>
  <text x="670" y="245" font-family="Arial" font-size="15" fill="#166534">${escapeXml(cleanReport.summary.decision)}</text>
  <text x="92" y="304" font-family="Arial" font-size="17" fill="#0f172a">Risky packet findings</text>
  <rect x="92" y="322" width="560" height="34" fill="#e2e8f0"/>
  <rect x="92" y="322" width="${riskyWidth}" height="34" fill="#ef4444"/>
  <text x="670" y="345" font-family="Arial" font-size="15" fill="#991b1b">${riskyReport.summary.findingCount} findings</text>
  <text x="92" y="396" font-family="Arial" font-size="17" fill="#0f172a">Critical release blockers</text>
  <rect x="92" y="414" width="560" height="34" fill="#e2e8f0"/>
  <rect x="92" y="414" width="${criticalWidth}" height="34" fill="#7f1d1d"/>
  <text x="670" y="437" font-family="Arial" font-size="15" fill="#7f1d1d">${riskyReport.summary.criticalFindings} critical</text>
</svg>`;
}

writeJson("clean-screening-report.json", clean);
writeJson("risky-screening-report.json", risky);
fs.writeFileSync(path.join(reportsDir, "risky-screening-handoff.md"), makeMarkdownReport(risky));
fs.writeFileSync(path.join(reportsDir, "screening-dashboard.svg"), makeSvg(clean, risky));

console.log("Clean decision:", clean.summary.decision);
console.log("Risky decision:", risky.summary.decision);
console.log("Risky finding count:", risky.summary.findingCount);
console.log(`Reports written to ${reportsDir}`);
