"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateSampleCustodyGraph,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const clean = evaluateSampleCustodyGraph(cleanPacket, { now: "2026-06-01T10:45:00.000Z" });
const risky = evaluateSampleCustodyGraph(riskyPacket, { now: "2026-06-01T10:45:00.000Z" });
const manifest = {
  module: "sample-custody-quality-graph-guard",
  issue: 17,
  generatedAt: "2026-06-01T10:45:00.000Z",
  scenarios: [
    { name: "clean", status: clean.status, fingerprint: clean.fingerprint, findings: clean.findings.length },
    { name: "risky", status: risky.status, fingerprint: risky.fingerprint, findings: risky.findings.length }
  ],
  artifacts: [
    "reports/clean-audit.json",
    "reports/risky-audit.json",
    "reports/risky-review.md",
    "reports/summary.svg",
    "reports/demo.mp4"
  ]
};

fs.writeFileSync(path.join(reportsDir, "clean-audit.json"), `${JSON.stringify(clean, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-audit.json"), `${JSON.stringify(risky, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-review.md"), renderMarkdownReport(risky, riskyPacket));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvgSummary(risky));
fs.writeFileSync(path.join(reportsDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Clean status: ${clean.status} (${clean.fingerprint})`);
console.log(`Risky status: ${risky.status} (${risky.fingerprint})`);
console.log(`Wrote reviewer artifacts to ${reportsDir}`);
