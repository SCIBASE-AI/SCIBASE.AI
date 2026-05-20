const fs = require("fs");
const path = require("path");
const { buildAudit } = require("./index");
const { previousVersion, nextVersion, consumers } = require("./sample-data");

const reportDir = path.join(__dirname, "reports");
fs.mkdirSync(reportDir, { recursive: true });

const audit = buildAudit(previousVersion, nextVersion, consumers);

function writeJson() {
  fs.writeFileSync(
    path.join(reportDir, "schema-evolution-audit.json"),
    `${JSON.stringify(audit, null, 2)}\n`
  );
}

function writeMarkdown() {
  const lines = [
    "# Dataset Schema Evolution Review",
    "",
    `Dataset: \`${audit.datasetId}\``,
    `Versions: \`${audit.previousVersion}\` -> \`${audit.nextVersion}\``,
    `Decision: \`${audit.decision}\``,
    `Compatibility score: \`${audit.compatibilityScore}\``,
    "",
    "## Findings",
    "",
    ...audit.findings.map((finding) => `- **${finding.severity}** ${finding.kind}: ${finding.message}`),
    "",
    "## Consumer Compatibility",
    "",
    ...audit.compatibility.map((consumer) => `- **${consumer.id}** (${consumer.kind}): ${consumer.decision}`),
    "",
    "## Reviewer Actions",
    "",
    ...audit.reviewerActions.map((action) => `- ${action}`)
  ];
  fs.writeFileSync(path.join(reportDir, "reviewer-packet.md"), `${lines.join("\n")}\n`);
}

function writeSvg() {
  const colors = {
    "hold-for-migration": "#b42318",
    "review-before-release": "#b54708",
    compatible: "#067647"
  };
  const findingRows = audit.findings.slice(0, 5).map((finding, index) => {
    const y = 235 + index * 36;
    return `<text x="54" y="${y}" class="row">${finding.severity.toUpperCase()} - ${escapeXml(finding.kind)} - ${escapeXml(finding.field)}</text>`;
  }).join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="36" y="36" width="1208" height="648" rx="18" fill="#ffffff" stroke="#d0d5dd"/>
  <style>
    .title { font: 700 42px Arial, sans-serif; fill: #101828; }
    .label { font: 700 20px Arial, sans-serif; fill: #344054; }
    .value { font: 600 28px Arial, sans-serif; fill: #101828; }
    .row { font: 500 22px Arial, sans-serif; fill: #344054; }
    .small { font: 500 18px Arial, sans-serif; fill: #667085; }
  </style>
  <text x="54" y="104" class="title">Dataset Schema Evolution Gate</text>
  <text x="54" y="150" class="small">${escapeXml(audit.datasetId)} ${escapeXml(audit.previousVersion)} -> ${escapeXml(audit.nextVersion)}</text>
  <rect x="54" y="178" width="330" height="64" rx="10" fill="${colors[audit.decision]}"/>
  <text x="78" y="219" style="font:700 24px Arial,sans-serif;fill:#fff">${escapeXml(audit.decision)}</text>
  <text x="440" y="205" class="label">Score</text>
  <text x="440" y="238" class="value">${audit.compatibilityScore}/100</text>
  <text x="54" y="292" class="label">Top Findings</text>
  ${findingRows}
  <text x="690" y="292" class="label">Consumer Decisions</text>
  ${audit.compatibility.map((consumer, index) => {
    const y = 335 + index * 48;
    return `<text x="690" y="${y}" class="row">${escapeXml(consumer.id)}: ${escapeXml(consumer.decision)}</text>`;
  }).join("\n")}
  <text x="54" y="610" class="small">Generated from synthetic sample data. No secrets, live records, or payment data.</text>
</svg>`;
  fs.writeFileSync(path.join(reportDir, "schema-evolution-summary.svg"), `${svg}\n`);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

writeJson();
writeMarkdown();
writeSvg();

console.log(`dataset-schema-evolution-gate demo wrote reports to ${reportDir}`);
