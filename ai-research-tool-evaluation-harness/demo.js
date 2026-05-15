"use strict";

const sampleBundle = require("./sample-data.json");
const { evaluateResearchToolRun } = require("./src/research-tool-evaluation-harness");

const report = evaluateResearchToolRun(sampleBundle);

console.log(JSON.stringify({
  manuscriptId: report.manuscriptId,
  decision: report.decision,
  score: report.score,
  summaryDecisions: report.summaryReports.map((summary) => ({
    mode: summary.mode,
    decision: summary.decision,
    findingIds: summary.findings.map((finding) => finding.id),
  })),
  peerReviewDecision: report.peerReviewReport.decision,
  citationDecision: report.citationReport.decision,
  blockerActions: report.actionQueue
    .filter((action) => action.severity === "blocker")
    .map((action) => action.findingId),
  auditDigest: report.auditDigest,
}, null, 2));
