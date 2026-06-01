"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  evaluateOnboardingClockPacket,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const clean = evaluateOnboardingClockPacket(cleanPacket, { now: "2026-06-01T10:30:00.000Z" });
const risky = evaluateOnboardingClockPacket(riskyPacket, { now: "2026-06-01T10:30:00.000Z" });
const manifest = {
  module: "challenge-onboarding-clock-parity-guard",
  issue: 18,
  generatedAt: "2026-06-01T10:30:00.000Z",
  scenarios: [
    {
      name: "clean",
      status: clean.status,
      fingerprint: clean.fingerprint,
      findings: clean.findings.length,
      nextClockStart: clean.nextClockStart
    },
    {
      name: "risky",
      status: risky.status,
      fingerprint: risky.fingerprint,
      findings: risky.findings.length,
      nextClockStart: risky.nextClockStart
    }
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
