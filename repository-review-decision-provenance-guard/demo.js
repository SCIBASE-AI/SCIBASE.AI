"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateReviewDecisionProvenance,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const clean = evaluateReviewDecisionProvenance(cleanPacket);
const risky = evaluateReviewDecisionProvenance(riskyPacket);

fs.writeFileSync(path.join(reportsDir, "clean-audit.json"), `${JSON.stringify(clean, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-audit.json"), `${JSON.stringify(risky, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-review.md"), renderMarkdownReport(risky, riskyPacket));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvgSummary(risky));
fs.writeFileSync(
  path.join(reportsDir, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      module: "repository-review-decision-provenance-guard",
      cleanStatus: clean.status,
      riskyStatus: risky.status,
      riskyFindings: risky.findings.length,
      artifacts: [
        "clean-audit.json",
        "risky-audit.json",
        "risky-review.md",
        "summary.svg",
        "demo.mp4"
      ]
    },
    null,
    2
  )}\n`
);

console.log(`Clean packet: ${clean.status} (${clean.findings.length} findings)`);
console.log(`Risky packet: ${risky.status} (${risky.findings.length} findings)`);
console.log(`Wrote reports to ${reportsDir}`);
