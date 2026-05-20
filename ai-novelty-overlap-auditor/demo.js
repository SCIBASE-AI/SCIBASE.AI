"use strict";

const path = require("node:path");
const { adjacentWorks, manuscript } = require("./sample-data");
const { auditNoveltyOverlap, writeDemoOutputs } = require("./index");

const audit = auditNoveltyOverlap(manuscript, adjacentWorks);
const outputDir = path.join(__dirname, "reports");
writeDemoOutputs(audit, outputDir);

console.log(JSON.stringify({
  releaseDecision: audit.releaseDecision,
  auditDigest: audit.auditDigest,
  claimCount: audit.claimAudits.length,
  reviewerTaskCount: audit.reviewerTasks.length,
  citationInsertionCount: audit.citationInsertions.length,
  reports: [
    "reports/audit.json",
    "reports/novelty-overlap.svg",
    "reports/review-packet.md",
    "reports/demo.mp4"
  ]
}, null, 2));
