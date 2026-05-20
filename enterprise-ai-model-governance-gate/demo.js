"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { evaluateRequests } = require("./index");
const { modelCatalog, policies, requests } = require("./sample-data");

function run() {
  const outputDir = path.join(__dirname, "demo-output");
  fs.mkdirSync(outputDir, { recursive: true });

  const packet = evaluateRequests({ requests, modelCatalog, policies });
  fs.writeFileSync(path.join(outputDir, "governance-packet.json"), `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "demo.svg"), renderSvg(packet));

  console.log(`approved: ${packet.summary.approved}`);
  console.log(`needs approval: ${packet.summary.needsApproval}`);
  console.log(`hold: ${packet.summary.hold}`);
  console.log(`audit digest: ${packet.auditDigest}`);
  console.log(`wrote ${path.relative(process.cwd(), outputDir)}/governance-packet.json`);
  console.log(`wrote ${path.relative(process.cwd(), outputDir)}/demo.svg`);
}

function renderSvg(packet) {
  const rows = packet.results
    .map((result, index) => {
      const y = 160 + index * 58;
      const color = result.status === "approved" ? "#15803d" : result.status === "needs-approval" ? "#ca8a04" : "#b91c1c";
      return `<text x="70" y="${y}" class="row">${result.id} ${result.lab} -> ${result.status}</text>
  <rect x="900" y="${y - 28}" width="190" height="36" rx="6" fill="${color}"/>
  <text x="920" y="${y - 4}" class="badge">${result.adminQueue}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="480" viewBox="0 0 1200 480">
  <style>
    .bg { fill: #f8fafc; }
    .panel { fill: white; stroke: #cbd5e1; stroke-width: 2; }
    .h1 { font: 700 34px Arial, sans-serif; fill: #0f172a; }
    .body { font: 400 18px Arial, sans-serif; fill: #334155; }
    .row { font: 700 20px Arial, sans-serif; fill: #111827; }
    .badge { font: 700 14px Arial, sans-serif; fill: white; }
  </style>
  <rect class="bg" width="1200" height="480"/>
  <rect class="panel" x="36" y="36" width="1128" height="400" rx="12"/>
  <text x="70" y="92" class="h1">Enterprise AI Model Governance Gate</text>
  <text x="70" y="124" class="body">Checks model requests before restricted research data reaches an AI system.</text>
  ${rows}
  <text x="70" y="424" class="body">digest ${packet.auditDigest} | approved ${packet.summary.approved} | holds ${packet.summary.hold}</text>
</svg>
`;
}

run();
