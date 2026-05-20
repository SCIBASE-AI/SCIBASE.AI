"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { auditManuscript } = require("./index");
const { manuscripts } = require("./sample-data");

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function renderSvg(audits) {
  const rows = audits
    .map((audit, index) => {
      const y = 150 + index * 88;
      const color = audit.readiness === "ready-for-human-review" ? "#1b8a5a" : "#b45309";
      const high = audit.findings.filter((finding) => finding.severity === "high").length;
      const medium = audit.findings.filter((finding) => finding.severity === "medium").length;
      return [
        `<text x="70" y="${y}" class="title">${escapeXml(audit.manuscriptId)}: ${escapeXml(audit.title)}</text>`,
        `<text x="70" y="${y + 28}" class="body">readiness: ${escapeXml(audit.readiness)} | high ${high} | medium ${medium} | digest ${audit.auditDigest}</text>`,
        `<rect x="930" y="${y - 27}" width="190" height="42" rx="6" fill="${color}"/>`,
        `<text x="954" y="${y}" class="badge">${audit.readiness === "ready-for-human-review" ? "review ready" : "author fix"}</text>`,
      ].join("\n");
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420" viewBox="0 0 1200 420">
  <style>
    .bg { fill: #f8fafc; }
    .panel { fill: white; stroke: #cbd5e1; stroke-width: 2; }
    .h1 { font: 700 34px Arial, sans-serif; fill: #0f172a; }
    .body { font: 400 18px Arial, sans-serif; fill: #334155; }
    .title { font: 700 20px Arial, sans-serif; fill: #111827; }
    .badge { font: 700 18px Arial, sans-serif; fill: white; }
  </style>
  <rect class="bg" width="1200" height="420"/>
  <rect class="panel" x="36" y="36" width="1128" height="348" rx="12"/>
  <text x="70" y="92" class="h1">Figure/Table Evidence Auditor</text>
  <text x="70" y="124" class="body">Evidence-linked summaries, peer-review redlines, and citation insert decisions for AI-assisted research tools.</text>
  ${rows}
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function run() {
  const outputDir = path.join(__dirname, "demo-output");
  fs.mkdirSync(outputDir, { recursive: true });

  const audits = manuscripts.map((manuscript) => auditManuscript(manuscript));
  writeJson(path.join(outputDir, "audit-packets.json"), audits);
  fs.writeFileSync(path.join(outputDir, "demo.svg"), renderSvg(audits));

  for (const audit of audits) {
    const high = audit.findings.filter((finding) => finding.severity === "high").length;
    const medium = audit.findings.filter((finding) => finding.severity === "medium").length;
    console.log(`${audit.manuscriptId}: ${audit.readiness} (${high} high, ${medium} medium) ${audit.auditDigest}`);
  }
  console.log(`wrote ${path.relative(process.cwd(), outputDir)}/audit-packets.json`);
  console.log(`wrote ${path.relative(process.cwd(), outputDir)}/demo.svg`);
}

run();
