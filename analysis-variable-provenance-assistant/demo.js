const fs = require("fs");
const path = require("path");

const { auditVariableProvenance } = require("./index");
const {
  manuscript,
  dataDictionary,
  pipelines,
  reproducibilityAttempts,
} = require("./sample-data");

const generatedAt = "2026-05-20T12:30:00.000Z";
const outputDir = path.join(__dirname, "demo-output");

fs.mkdirSync(outputDir, { recursive: true });

const audit = auditVariableProvenance({
  manuscript,
  dataDictionary,
  pipelines,
  reproducibilityAttempts,
  generatedAt,
});

fs.writeFileSync(
  path.join(outputDir, "provenance-audit.json"),
  `${JSON.stringify(audit, null, 2)}\n`
);
fs.writeFileSync(path.join(outputDir, "demo.svg"), buildSvg(audit));

console.log("Analysis variable provenance assistant demo");
console.log(`Project: ${audit.title}`);
console.log(`Analyses audited: ${audit.reviewerReport.counts.analyses}`);
console.log(`High-risk analyses: ${audit.reviewerReport.counts.highRiskAnalyses}`);
console.log(`Undefined variables: ${audit.reviewerReport.counts.undefinedVariables}`);
console.log(`Unit drift findings: ${audit.reviewerReport.counts.unitDriftFindings}`);
console.log(`Wrote ${path.join(outputDir, "provenance-audit.json")}`);
console.log(`Wrote ${path.join(outputDir, "demo.svg")}`);

function buildSvg(audit) {
  const rows = audit.analysisPackets
    .map((packet, index) => {
      const y = 196 + index * 82;
      const color = packet.decision === "ready_for_review"
        ? "#1f8a5b"
        : packet.decision === "needs_author_clarification"
          ? "#ad6f00"
          : "#b42318";
      const flags = packet.flags.length === 0 ? "No flags" : packet.flags.join(" | ");
      return `<g transform="translate(64 ${y})">
    <rect width="832" height="60" rx="8" fill="#ffffff" stroke="#cfd8dc"/>
    <circle cx="26" cy="30" r="10" fill="${color}"/>
    <text x="48" y="25" class="team">${escapeXml(packet.analysisId)}</text>
    <text x="48" y="45" class="meta">${escapeXml(formatDecision(packet.decision))} - confidence ${packet.reproducibilityConfidence}</text>
    <text x="365" y="25" class="small">${escapeXml(flags)}</text>
    <text x="365" y="45" class="small">${escapeXml(packet.claim)}</text>
  </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520" role="img" aria-label="Analysis variable provenance assistant demo">
  <style>
    .title { font: 700 28px Arial, sans-serif; fill: #102027; }
    .subtitle { font: 400 15px Arial, sans-serif; fill: #455a64; }
    .metric { font: 700 24px Arial, sans-serif; }
    .label { font: 400 13px Arial, sans-serif; fill: #546e7a; }
    .team { font: 700 16px Arial, sans-serif; fill: #102027; }
    .meta { font: 400 13px Arial, sans-serif; fill: #455a64; }
    .small { font: 400 11px Arial, sans-serif; fill: #607d8b; }
  </style>
  <rect width="960" height="520" fill="#f4f7f9"/>
  <text x="64" y="58" class="title">Analysis Variable Provenance Assistant</text>
  <text x="64" y="84" class="subtitle">${escapeXml(audit.title)} - ${escapeXml(audit.generatedAt)}</text>
  ${metricCard(64, 112, "Analyses", audit.reviewerReport.counts.analyses, "#0b5fff")}
  ${metricCard(252, 112, "High risk", audit.reviewerReport.counts.highRiskAnalyses, "#b42318")}
  ${metricCard(440, 112, "Undefined vars", audit.reviewerReport.counts.undefinedVariables, "#ad6f00")}
  ${metricCard(628, 112, "Unit drift", audit.reviewerReport.counts.unitDriftFindings, "#6f42c1")}
  ${rows}
  <text x="64" y="478" class="subtitle">${escapeXml(audit.reviewerReport.priorityActions.join("  "))}</text>
</svg>`;
}

function metricCard(x, y, label, value, color) {
  return `<g transform="translate(${x} ${y})">
    <rect width="150" height="58" rx="8" fill="#ffffff" stroke="#cfd8dc"/>
    <text x="18" y="25" class="metric" fill="${color}">${value}</text>
    <text x="18" y="45" class="label">${escapeXml(label)}</text>
  </g>`;
}

function formatDecision(decision) {
  return decision.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
