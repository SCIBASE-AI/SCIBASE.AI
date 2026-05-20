"use strict";

const path = require("node:path");
const { baselineSnapshot, releaseCandidate } = require("./sample-data");
const { auditRepositoryEnvironmentDrift, writeDemoOutputs } = require("./index");

const audit = auditRepositoryEnvironmentDrift(baselineSnapshot, releaseCandidate);
writeDemoOutputs(audit, path.join(__dirname, "reports"));

console.log(JSON.stringify({
  releaseDecision: audit.releaseDecision,
  semanticVersionImpact: audit.semanticVersionImpact,
  blockerCount: audit.blockers.length,
  reviewerTaskCount: audit.reviewerTasks.length,
  auditDigest: audit.auditDigest,
  reports: [
    "reports/drift-audit.json",
    "reports/environment-drift.svg",
    "reports/review-packet.md",
    "reports/demo.mp4"
  ]
}, null, 2));
