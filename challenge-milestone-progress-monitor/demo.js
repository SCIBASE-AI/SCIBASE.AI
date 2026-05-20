const fs = require("fs");
const path = require("path");

const { auditChallengeMilestones } = require("./index");
const { challenge, submissions } = require("./sample-data");

const generatedAt = "2026-05-20T12:00:00.000Z";
const outputDir = path.join(__dirname, "demo-output");

fs.mkdirSync(outputDir, { recursive: true });

const audit = auditChallengeMilestones({ challenge, submissions, generatedAt });
fs.writeFileSync(
  path.join(outputDir, "audit-packets.json"),
  `${JSON.stringify(audit, null, 2)}\n`
);
fs.writeFileSync(path.join(outputDir, "demo.svg"), buildSvg(audit));

console.log(`Challenge milestone progress monitor demo`);
console.log(`Challenge: ${audit.title}`);
console.log(`Teams audited: ${audit.summary.counts.totalTeams}`);
console.log(`Ready for review: ${audit.summary.counts.readyForReview}`);
console.log(`Escalations: ${audit.summary.counts.escalations}`);
console.log(`Needs solver action: ${audit.summary.counts.needsSolverAction}`);
console.log(`Wrote ${path.join(outputDir, "audit-packets.json")}`);
console.log(`Wrote ${path.join(outputDir, "demo.svg")}`);

function buildSvg(audit) {
  const rows = audit.packets
    .map((packet, index) => {
      const y = 198 + index * 82;
      const color = packet.decision === "ready_for_review"
        ? "#1f8a5b"
        : packet.decision === "hold_for_escalation"
          ? "#b42318"
          : "#ad6f00";
      const flags = packet.flags.length === 0 ? "No flags" : packet.flags.join(" | ");
      return `<g transform="translate(64 ${y})">
    <rect width="832" height="60" rx="8" fill="#ffffff" stroke="#cfd8dc"/>
    <circle cx="26" cy="30" r="10" fill="${color}"/>
    <text x="48" y="25" class="team">${escapeXml(packet.teamName)}</text>
    <text x="48" y="45" class="meta">${escapeXml(packet.milestoneLabel)} - ${escapeXml(formatDecision(packet.decision))}</text>
    <text x="360" y="25" class="meta">Risk ${packet.riskScore}</text>
    <text x="360" y="45" class="small">${escapeXml(flags)}</text>
    <text x="742" y="36" class="digest">${escapeXml(packet.auditDigest)}</text>
  </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520" role="img" aria-label="Challenge milestone progress monitor demo">
  <style>
    .title { font: 700 28px Arial, sans-serif; fill: #102027; }
    .subtitle { font: 400 15px Arial, sans-serif; fill: #455a64; }
    .metric { font: 700 24px Arial, sans-serif; }
    .label { font: 400 13px Arial, sans-serif; fill: #546e7a; }
    .team { font: 700 16px Arial, sans-serif; fill: #102027; }
    .meta { font: 400 13px Arial, sans-serif; fill: #455a64; }
    .small { font: 400 11px Arial, sans-serif; fill: #607d8b; }
    .digest { font: 400 10px Consolas, monospace; fill: #607d8b; }
  </style>
  <rect width="960" height="520" fill="#f4f7f9"/>
  <text x="64" y="58" class="title">Challenge Milestone Progress Monitor</text>
  <text x="64" y="84" class="subtitle">${escapeXml(audit.title)} - ${escapeXml(audit.generatedAt)}</text>
  ${metricCard(64, 112, "Teams", audit.summary.counts.totalTeams, "#0b5fff")}
  ${metricCard(252, 112, "Ready", audit.summary.counts.readyForReview, "#1f8a5b")}
  ${metricCard(440, 112, "Escalations", audit.summary.counts.escalations, "#b42318")}
  ${metricCard(628, 112, "Solver action", audit.summary.counts.needsSolverAction, "#ad6f00")}
  ${rows}
  <text x="64" y="478" class="subtitle">${escapeXml(audit.summary.nextActions.join("  "))}</text>
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
