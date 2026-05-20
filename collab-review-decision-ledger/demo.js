const fs = require("fs");
const path = require("path");

const { evaluateReviewDecision } = require("./index");
const { manuscript } = require("./sample-data");

const generatedAt = "2026-05-20T13:00:00.000Z";
const outputDir = path.join(__dirname, "demo-output");

fs.mkdirSync(outputDir, { recursive: true });

const audit = evaluateReviewDecision({ manuscript, generatedAt });
fs.writeFileSync(path.join(outputDir, "review-decision-ledger.json"), `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "demo.svg"), buildSvg(audit));

console.log("Collaborative review decision ledger demo");
console.log(`Document: ${audit.title}`);
console.log(`Sections: ${audit.releaseSummary.counts.sections}`);
console.log(`Ready to freeze: ${audit.releaseSummary.counts.readyToFreeze}`);
console.log(`Hold publish: ${audit.releaseSummary.counts.holdPublish}`);
console.log(`Blocking comments: ${audit.releaseSummary.counts.blockingComments}`);
console.log(`Wrote ${path.join(outputDir, "review-decision-ledger.json")}`);
console.log(`Wrote ${path.join(outputDir, "demo.svg")}`);

function buildSvg(audit) {
  const rows = audit.sectionDecisions.map((section, index) => {
    const y = 196 + index * 82;
    const color = section.decision === "ready_to_freeze" ? "#1f8a5b" : "#b42318";
    const flags = section.flags.length === 0 ? "No blockers" : section.flags.join(" | ");
    return `<g transform="translate(64 ${y})">
    <rect width="832" height="60" rx="8" fill="#ffffff" stroke="#cfd8dc"/>
    <circle cx="26" cy="30" r="10" fill="${color}"/>
    <text x="48" y="25" class="team">${escapeXml(section.sectionTitle)}</text>
    <text x="48" y="45" class="meta">${escapeXml(formatDecision(section.decision))} - risk ${section.riskScore}</text>
    <text x="330" y="25" class="small">${escapeXml(flags)}</text>
    <text x="330" y="45" class="small">${escapeXml(section.decisionDigest)}</text>
  </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520" role="img" aria-label="Collaborative review decision ledger demo">
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
  <text x="64" y="58" class="title">Collaborative Review Decision Ledger</text>
  <text x="64" y="84" class="subtitle">${escapeXml(audit.title)} - ${escapeXml(audit.generatedAt)}</text>
  ${metricCard(64, 112, "Sections", audit.releaseSummary.counts.sections, "#0b5fff")}
  ${metricCard(252, 112, "Ready", audit.releaseSummary.counts.readyToFreeze, "#1f8a5b")}
  ${metricCard(440, 112, "Hold", audit.releaseSummary.counts.holdPublish, "#b42318")}
  ${metricCard(628, 112, "Comments", audit.releaseSummary.counts.blockingComments, "#ad6f00")}
  ${rows}
  <text x="64" y="478" class="subtitle">${escapeXml(audit.releaseSummary.priorityActions.join("  "))}</text>
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
