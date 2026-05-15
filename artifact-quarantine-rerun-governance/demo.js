"use strict";

const sampleBundle = require("./sample-data.json");
const { evaluateHostingGovernance } = require("./src/artifact-quarantine-rerun-governance");

const report = evaluateHostingGovernance(sampleBundle);

console.log(JSON.stringify({
  projectId: report.projectId,
  decision: report.decision,
  fairScore: report.fairScore,
  quarantinedArtifacts: report.artifactReports
    .filter((artifact) => artifact.decision === "quarantine")
    .map((artifact) => artifact.artifactId),
  readyComputeTriggers: report.computePlans
    .filter((trigger) => trigger.decision === "ready")
    .map((trigger) => trigger.triggerId),
  blockedComputeTriggers: report.computePlans
    .filter((trigger) => trigger.decision === "blocked")
    .map((trigger) => trigger.triggerId),
  retentionActions: report.retentionActions,
  auditDigest: report.auditDigest,
}, null, 2));
