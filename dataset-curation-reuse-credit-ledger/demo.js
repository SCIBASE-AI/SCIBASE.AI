const fs = require("fs");
const path = require("path");

const { auditReuseCredits } = require("./index");
const { assets, reuseEvents } = require("./sample-data");

const generatedAt = "2026-05-20T13:30:00.000Z";
const outputDir = path.join(__dirname, "demo-output");

fs.mkdirSync(outputDir, { recursive: true });

const audit = auditReuseCredits({ assets, reuseEvents, generatedAt });
fs.writeFileSync(path.join(outputDir, "reuse-credit-ledger.json"), `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "demo.svg"), buildSvg(audit));

console.log("Dataset curation reuse credit ledger demo");
console.log(`Reuse events: ${audit.reputationSummary.counts.reuseEvents}`);
console.log(`Awarded: ${audit.reputationSummary.counts.awarded}`);
console.log(`Quarantined: ${audit.reputationSummary.counts.quarantined}`);
console.log(`License issues: ${audit.reputationSummary.counts.licenseIssues}`);
console.log(`Wrote ${path.join(outputDir, "reuse-credit-ledger.json")}`);
console.log(`Wrote ${path.join(outputDir, "demo.svg")}`);

function buildSvg(audit) {
  const rows = audit.reusePackets.map((packet, index) => {
    const y = 196 + index * 82;
    const color = packet.decision === "award_credit" ? "#1f8a5b" : "#b42318";
    const flags = packet.flags.length === 0 ? "Credit awarded" : packet.flags.join(" | ");
    return `<g transform="translate(64 ${y})">
    <rect width="832" height="60" rx="8" fill="#ffffff" stroke="#cfd8dc"/>
    <circle cx="26" cy="30" r="10" fill="${color}"/>
    <text x="48" y="25" class="team">${escapeXml(packet.eventId)} - ${escapeXml(packet.assetTitle)}</text>
    <text x="48" y="45" class="meta">${escapeXml(formatDecision(packet.decision))}</text>
    <text x="330" y="25" class="small">${escapeXml(flags)}</text>
    <text x="330" y="45" class="small">${escapeXml(packet.reuseDigest)}</text>
  </g>`;
  }).join("");

  const deltas = audit.reputationSummary.reputationDeltas
    .map((delta) => `${delta.userId} +${delta.points}`)
    .join("  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520" role="img" aria-label="Dataset curation reuse credit ledger demo">
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
  <text x="64" y="58" class="title">Dataset Curation Reuse Credit Ledger</text>
  <text x="64" y="84" class="subtitle">Community reputation from downstream dataset and code reuse</text>
  ${metricCard(64, 112, "Reuse", audit.reputationSummary.counts.reuseEvents, "#0b5fff")}
  ${metricCard(252, 112, "Awarded", audit.reputationSummary.counts.awarded, "#1f8a5b")}
  ${metricCard(440, 112, "Quarantine", audit.reputationSummary.counts.quarantined, "#b42318")}
  ${metricCard(628, 112, "License", audit.reputationSummary.counts.licenseIssues, "#ad6f00")}
  ${rows}
  <text x="64" y="478" class="subtitle">${escapeXml(deltas)}</text>
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
