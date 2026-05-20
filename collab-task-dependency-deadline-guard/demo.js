"use strict";

const fs = require("fs");
const path = require("path");
const {
  evaluateMilestoneReadiness,
  renderReviewerMarkdown,
  renderSvgSummary
} = require("./index");
const {
  milestone,
  collaborators,
  anchors,
  comments,
  tasks
} = require("./sample-data");

const reportsDir = path.join(__dirname, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

const audit = evaluateMilestoneReadiness({
  milestone,
  collaborators,
  anchors,
  comments,
  tasks
});

fs.writeFileSync(path.join(reportsDir, "task-readiness.json"), `${JSON.stringify(audit, null, 2)}\n`);
fs.writeFileSync(path.join(reportsDir, "reviewer-packet.md"), renderReviewerMarkdown(audit));
fs.writeFileSync(path.join(reportsDir, "task-summary.svg"), renderSvgSummary(audit));

console.log(`Readiness: ${audit.readiness} (${audit.readinessScore}/100)`);
console.log(`Findings: ${audit.findings.map((finding) => finding.code).join(", ")}`);
console.log(`Reports written to ${reportsDir}`);
