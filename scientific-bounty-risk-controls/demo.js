"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { analyzeScientificBountyRisk } = require("./src/bounty-risk-controls");

const samplePath = path.join(__dirname, "sample-data.json");
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = analyzeScientificBountyRisk(sample);

const demoSummary = {
  challengeId: report.challengeId,
  sponsorId: report.sponsorId,
  summary: report.summary,
  duplicateFindings: report.duplicateFindings.map((finding) => ({
    code: finding.code,
    severity: finding.severity,
    submissionIds: finding.submissionIds,
    weightedSimilarity: finding.weightedSimilarity,
    sharedArtifactHashes: finding.sharedArtifactHashes,
  })),
  conflictFindings: report.conflictFindings.map((finding) => ({
    code: finding.code,
    severity: finding.severity,
    submissionId: finding.submissionId,
    reviewerId: finding.reviewerId,
    summary: finding.summary,
  })),
  timingFindings: report.timingFindings.map((finding) => ({
    code: finding.code,
    severity: finding.severity,
    submissionIds: finding.submissionIds,
    teamIds: finding.teamIds,
  })),
  payoutDecisions: report.payoutDecisions,
  arbitrationQueue: report.arbitrationQueue.map((decision) => ({
    submissionId: decision.submissionId,
    teamId: decision.teamId,
    payoutStatus: decision.payoutStatus,
    riskScore: decision.riskScore,
  })),
  auditDigest: report.auditDigest,
};

console.log(JSON.stringify(demoSummary, null, 2));
