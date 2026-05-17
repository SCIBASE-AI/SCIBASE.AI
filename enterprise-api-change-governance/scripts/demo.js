import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApiChangeGovernance } from "../src/api-change-governance.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const sample = JSON.parse(await readFile(join(rootDir, "data", "sample-change-plan.json"), "utf8"));
const report = buildApiChangeGovernance(sample, { generatedAt: sample.asOf });

await mkdir(join(rootDir, "docs"), { recursive: true });
await writeFile(join(rootDir, "docs", "demo.svg"), renderSvg(report));
await writeFile(join(rootDir, "docs", "governance-report.json"), `${JSON.stringify(report, null, 2)}\n`);

console.log("Enterprise API Change Governance");
console.log(`Portfolio: ${report.portfolioId}`);
console.log(`Changes: ${report.dashboard.totalChanges}`);
console.log(`State distribution: ${JSON.stringify(report.dashboard.byState)}`);
console.log(`Critical integrations impacted: ${report.dashboard.criticalIntegrationsImpacted}`);
console.log(`Highest risk score: ${report.dashboard.highestRiskScore}`);
console.log(`Audit digest: ${report.auditDigest}`);

for (const review of report.reviews) {
  console.log("");
  console.log(`${review.state.toUpperCase()} ${review.riskScore} - ${review.title}`);
  console.log(`Affected consumers: ${review.affectedConsumers.length}`);
  console.log(`Evidence digest: ${review.evidenceDigest}`);
  for (const action of review.adminActions.slice(0, 3)) {
    console.log(`- ${action}`);
  }
}

function renderSvg(report) {
  const rows = report.reviews.map((review, index) => {
    const y = 232 + index * 112;
    const color = stateColor(review.state);
    const findings = review.findings
      .slice(0, 2)
      .map((finding) => finding.code)
      .join(", ") || "no blockers";
    return `
      <g transform="translate(72 ${y})">
        <rect width="1116" height="82" rx="14" fill="#ffffff" stroke="#d9e2ec"/>
        <rect width="12" height="82" rx="6" fill="${color}"/>
        <text x="34" y="30" class="row-title">${escapeXml(review.title)}</text>
        <text x="34" y="58" class="muted">${review.changeId} - ${review.affectedConsumers.length} affected integrations - ${escapeXml(findings)}</text>
        <text x="980" y="35" class="state" fill="${color}">${review.state.toUpperCase()}</text>
        <text x="980" y="60" class="muted">risk ${review.riskScore}</text>
      </g>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">Enterprise API Change Governance demo</title>
  <desc id="desc">Dashboard preview for SCIBASE enterprise API and webhook compatibility review.</desc>
  <style>
    .title { font: 700 42px Inter, Arial, sans-serif; fill: #102a43; }
    .subtitle { font: 500 18px Inter, Arial, sans-serif; fill: #486581; }
    .metric { font: 700 32px Inter, Arial, sans-serif; fill: #102a43; }
    .label { font: 600 13px Inter, Arial, sans-serif; fill: #627d98; text-transform: uppercase; letter-spacing: 1px; }
    .row-title { font: 700 19px Inter, Arial, sans-serif; fill: #102a43; }
    .muted { font: 500 14px Inter, Arial, sans-serif; fill: #627d98; }
    .state { font: 800 18px Inter, Arial, sans-serif; }
  </style>
  <rect width="1280" height="720" fill="#f5f7fa"/>
  <circle cx="1112" cy="96" r="92" fill="#d64545" opacity="0.08"/>
  <circle cx="995" cy="618" r="134" fill="#1992d4" opacity="0.08"/>
  <text x="72" y="82" class="title">Enterprise API Change Governance</text>
  <text x="72" y="116" class="subtitle">Versioned REST and webhook contract review for institutional integrations</text>
  <g transform="translate(72 148)">
    <rect width="250" height="56" rx="12" fill="#ffffff" stroke="#d9e2ec"/>
    <text x="22" y="23" class="label">Changes</text>
    <text x="178" y="38" class="metric">${report.dashboard.totalChanges}</text>
  </g>
  <g transform="translate(344 148)">
    <rect width="250" height="56" rx="12" fill="#ffffff" stroke="#d9e2ec"/>
    <text x="22" y="23" class="label">Blocked</text>
    <text x="178" y="38" class="metric">${report.dashboard.blockedChanges}</text>
  </g>
  <g transform="translate(616 148)">
    <rect width="250" height="56" rx="12" fill="#ffffff" stroke="#d9e2ec"/>
    <text x="22" y="23" class="label">Critical Impacts</text>
    <text x="178" y="38" class="metric">${report.dashboard.criticalIntegrationsImpacted}</text>
  </g>
  <g transform="translate(888 148)">
    <rect width="300" height="56" rx="12" fill="#ffffff" stroke="#d9e2ec"/>
    <text x="22" y="23" class="label">Audit Digest</text>
    <text x="22" y="42" class="muted">${report.auditDigest.slice(0, 32)}</text>
  </g>
  ${rows}
  <text x="72" y="650" class="subtitle">Outputs: admin actions, sandbox gates, migration notices, signed CloudEvents-style webhook evidence, export manifest.</text>
</svg>
`;
}

function stateColor(state) {
  if (state === "ready") return "#0e9f6e";
  if (state === "watch") return "#d97706";
  if (state === "hold") return "#c2410c";
  return "#c81e1e";
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
