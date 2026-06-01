"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateGeospatialReviewPacket,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { riskyPacket, cleanPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const now = "2026-06-01T10:30:00.000Z";
const risky = evaluateGeospatialReviewPacket(riskyPacket, { now });
const clean = evaluateGeospatialReviewPacket(cleanPacket, { now });

fs.writeFileSync(path.join(reportsDir, "risky-audit.json"), `${JSON.stringify(risky, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "clean-audit.json"), `${JSON.stringify(clean, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "risky-review.md"), renderMarkdownReport(risky, riskyPacket));
fs.writeFileSync(path.join(reportsDir, "summary.svg"), renderSvgSummary(risky));
fs.writeFileSync(
  path.join(reportsDir, "manifest.json"),
  `${JSON.stringify(
    {
      generatedAt: now,
      artifacts: [
        "risky-audit.json",
        "clean-audit.json",
        "risky-review.md",
        "summary.svg",
        "demo.mp4"
      ],
      riskyStatus: risky.status,
      cleanStatus: clean.status,
      riskyFingerprint: risky.fingerprint,
      cleanFingerprint: clean.fingerprint
    },
    null,
    2
  )}\n`
);

console.log(`Risky packet: ${risky.status} (${risky.findings.length} findings)`);
console.log(`Clean packet: ${clean.status} (${clean.findings.length} findings)`);
console.log(`Wrote reports to ${reportsDir}`);
