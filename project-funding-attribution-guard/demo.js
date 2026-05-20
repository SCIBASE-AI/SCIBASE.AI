"use strict";

const fs = require("fs");
const path = require("path");
const {
  evaluateProjectFundingAttribution,
  renderReviewerMarkdown,
  renderSvgSummary
} = require("./index");
const { project } = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const audit = evaluateProjectFundingAttribution(project);

fs.writeFileSync(path.join(reportsDir, "attribution-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "reviewer-packet.md"), renderReviewerMarkdown(audit));
fs.writeFileSync(path.join(reportsDir, "attribution-summary.svg"), renderSvgSummary(audit));

console.log(`Readiness: ${audit.readiness} (${audit.readinessScore}/100)`);
console.log(`Findings: ${audit.findings.map((finding) => finding.code).join(", ")}`);
console.log(`Reports written to ${reportsDir}`);
