"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateAccessibleExportPacket,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, revisionPacket, holdPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const scenarios = [
  ["clean", cleanPacket],
  ["revision", revisionPacket],
  ["hold", holdPacket]
];

const manifest = scenarios.map(([name, packet]) => {
  const result = evaluateAccessibleExportPacket(packet, {
    now: "2026-06-01T10:15:00.000Z"
  });
  fs.writeFileSync(path.join(reportsDir, `${name}-report.md`), renderMarkdownReport(result));
  fs.writeFileSync(path.join(reportsDir, `${name}-summary.svg`), renderSvgSummary(result));
  fs.writeFileSync(path.join(reportsDir, `${name}-result.json`), `${JSON.stringify(result, null, 2)}\n`);
  return {
    scenario: name,
    decision: result.decision,
    exportAllowed: result.exportAllowed,
    findings: result.findings.length,
    digest: result.digest
  };
});

fs.writeFileSync(path.join(reportsDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
