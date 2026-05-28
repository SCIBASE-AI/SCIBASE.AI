"use strict";

const fs = require("node:fs");
const path = require("node:path");
const charges = require("./data/sample-charges.json");
const { evaluateCharges, summarizeDecisions } = require("./guard");

const artifactDir = path.join(__dirname, "artifacts");
const decisions = evaluateCharges(charges);
const summary = summarizeDecisions(decisions);

fs.mkdirSync(artifactDir, { recursive: true });

fs.writeFileSync(
  path.join(artifactDir, "decision-report.json"),
  `${JSON.stringify({ summary, decisions }, null, 2)}\n`,
);

fs.writeFileSync(path.join(artifactDir, "decision-report.md"), renderMarkdown(summary, decisions));
fs.writeFileSync(path.join(artifactDir, "decision-flow.svg"), renderSvg(summary));

console.log(`wrote ${decisions.length} grant cost-share decisions`);
console.log(`held_amount=${summary.heldAmount} reroute_amount=${summary.rerouteAmount}`);

function renderMarkdown(reportSummary, reportDecisions) {
  const lines = [
    "# Grant Cost-Share Guard Decision Report",
    "",
    "## Summary",
    "",
    `- Total charges reviewed: ${reportSummary.total}`,
    `- Approved: ${reportSummary.approve}`,
    `- Held: ${reportSummary.hold}`,
    `- Held amount: $${reportSummary.heldAmount.toLocaleString()}`,
    `- Reroute amount: $${reportSummary.rerouteAmount.toLocaleString()}`,
    "",
    "## Decisions",
    "",
  ];

  for (const decision of reportDecisions) {
    lines.push(`### ${decision.id}`);
    lines.push("");
    lines.push(`- Decision: ${decision.decision}`);
    lines.push(`- Institution: ${decision.institution}`);
    lines.push(`- Category: ${decision.category}`);
    lines.push(`- Requested: $${decision.amounts.requested.toLocaleString()}`);
    lines.push(`- Reasons: ${decision.reasons.length ? decision.reasons.join(", ") : "none"}`);
    lines.push(`- Audit digest: ${decision.evidence.auditDigest}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function renderSvg(reportSummary) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="220" role="img" aria-label="Grant cost-share guard decision flow">
  <rect width="760" height="220" fill="#0f172a"/>
  <text x="30" y="40" fill="#f8fafc" font-family="Arial" font-size="22">Grant Cost-Share Revenue Guard</text>
  <g font-family="Arial" font-size="14" fill="#e2e8f0">
    <rect x="30" y="80" width="150" height="64" rx="8" fill="#1e293b" stroke="#38bdf8"/>
    <text x="52" y="108">Charge packet</text>
    <text x="52" y="130">synthetic only</text>
    <path d="M180 112 H250" stroke="#94a3b8" stroke-width="2"/>
    <rect x="250" y="80" width="170" height="64" rx="8" fill="#1e293b" stroke="#a78bfa"/>
    <text x="274" y="105">Award, cap, privacy,</text>
    <text x="274" y="128">approval checks</text>
    <path d="M420 112 H490" stroke="#94a3b8" stroke-width="2"/>
    <rect x="490" y="80" width="220" height="64" rx="8" fill="#1e293b" stroke="#22c55e"/>
    <text x="512" y="105">Approve ${reportSummary.approve} / Hold ${reportSummary.hold}</text>
    <text x="512" y="128">Held $${reportSummary.heldAmount}</text>
  </g>
</svg>
`;
}
