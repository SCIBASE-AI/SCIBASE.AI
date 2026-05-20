"use strict";

const fs = require("fs");
const path = require("path");
const {
  auditNotebookPreviewIntegrity,
  renderDashboardSvg,
} = require("./index");
const {
  cleanNotebookPackage,
  riskyNotebookPackage,
} = require("./sample-data");

const outputDir = path.join(__dirname, "demo-output");
fs.mkdirSync(outputDir, { recursive: true });

const generatedAt = "2026-05-20T10:00:00.000Z";
const reports = [
  auditNotebookPreviewIntegrity(cleanNotebookPackage, { generatedAt }),
  auditNotebookPreviewIntegrity(riskyNotebookPackage, { generatedAt }),
];

const portfolio = {
  generatedAt,
  module: "notebook-preview-integrity-gate",
  summary: reports.map(function summarize(report) {
    return {
      projectId: report.projectId,
      title: report.title,
      decision: report.decision,
      score: report.score,
      fairScore: report.fairScore.overall,
      digest: report.digest,
    };
  }),
  reports,
};

const riskReport = reports.find(function isBlocked(report) {
  return report.decision === "blocked";
});

fs.writeFileSync(path.join(outputDir, "notebook-preview-report.json"), JSON.stringify(portfolio, null, 2));
fs.writeFileSync(path.join(outputDir, "reviewer-packet.md"), riskReport.reviewerPacket);
fs.writeFileSync(path.join(outputDir, "notebook-preview-dashboard.svg"), renderDashboardSvg(riskReport));

console.log("Generated demo artifacts:");
console.log("- " + path.relative(process.cwd(), path.join(outputDir, "notebook-preview-report.json")));
console.log("- " + path.relative(process.cwd(), path.join(outputDir, "reviewer-packet.md")));
console.log("- " + path.relative(process.cwd(), path.join(outputDir, "notebook-preview-dashboard.svg")));
console.log("");
portfolio.summary.forEach(function printSummary(item) {
  console.log(item.projectId + ": " + item.decision + " (" + String(item.score) + "/100), FAIR " + String(item.fairScore) + "/100");
});
