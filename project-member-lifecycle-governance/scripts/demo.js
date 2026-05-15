"use strict";

const fs = require("node:fs");
const path = require("node:path");
const workspace = require("../data/sample-workspace.json");
const { evaluateWorkspace } = require("../src/member-lifecycle");

const outDir = path.join(__dirname, "..", "docs");
fs.mkdirSync(outDir, { recursive: true });

const evaluation = evaluateWorkspace(workspace, { now: "2026-05-15T00:00:00.000Z" });
fs.writeFileSync(path.join(outDir, "demo-output.json"), `${JSON.stringify(evaluation, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "demo.svg"), buildSvg(evaluation));

console.log(JSON.stringify(evaluation.summary));
console.log(`highest-risk project: ${evaluation.projects.slice().sort((a, b) => b.lifecycleRisk - a.lifecycleRisk)[0].name}`);

function buildSvg(evaluation) {
  const rows = evaluation.projects
    .slice()
    .sort((a, b) => b.lifecycleRisk - a.lifecycleRisk)
    .map((project, index) => {
      const y = 184 + index * 108;
      const color = project.blockers.length ? "#fee2e2" : project.lifecycleRisk >= 4 ? "#fff7ed" : "#ecfdf5";
      const title = escapeXml(project.name);
      const detail = escapeXml(
        `${project.transferPlans.length} transfer plan(s), ${project.revokedGrants.length} grant revoke(s), ${project.invitationActions.filter((invite) => invite.action === "revoke").length} invite revoke(s)`
      );
      return `
      <g transform="translate(70 ${y})">
        <rect width="1140" height="82" rx="14" fill="${color}" stroke="#cbd5e1"/>
        <text x="24" y="34" fill="#111827" font-size="25" font-weight="800">${title}</text>
        <text x="24" y="62" fill="#475569" font-size="18">${detail}</text>
        <text x="1034" y="50" text-anchor="middle" fill="#111827" font-size="25" font-weight="800">${project.lifecycleRisk}</text>
        <text x="1034" y="70" text-anchor="middle" fill="#64748b" font-size="13">risk</text>
        <circle cx="1100" cy="41" r="24" fill="${project.blockers.length ? "#b91c1c" : "#0f766e"}"/>
        <text x="1100" y="48" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="800">${index + 1}</text>
      </g>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#ffffff"/>
  <rect x="40" y="38" width="1200" height="644" rx="28" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="70" y="96" fill="#111827" font-family="Arial, sans-serif" font-size="42" font-weight="800">Project Member Lifecycle Governance</text>
  <text x="70" y="130" fill="#475569" font-family="Arial, sans-serif" font-size="20">Offboarding, owner handoff, stale invitation cleanup, and audit evidence for research projects.</text>
  <g font-family="Arial, sans-serif">
    <text x="70" y="164" fill="#0f766e" font-size="18" font-weight="700">${evaluation.summary.transferPlanCount} transfer plans</text>
    <text x="240" y="164" fill="#0f766e" font-size="18" font-weight="700">${evaluation.summary.grantRevocationCount} grant revocations</text>
    <text x="455" y="164" fill="#0f766e" font-size="18" font-weight="700">${evaluation.summary.invitationRevocationCount} invitation revocations</text>
    ${rows}
    <rect x="70" y="560" width="1140" height="80" rx="14" fill="#111827"/>
    <text x="96" y="592" fill="#f8fafc" font-size="21" font-weight="800">Audit evidence</text>
    <text x="96" y="622" fill="#cbd5e1" font-size="17">${escapeXml(evaluation.projects[0].auditEvents[0].digest)} is a deterministic digest for the first review event.</text>
  </g>
</svg>
`;
  return svg.replace(/[ \t]+$/gm, "");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
