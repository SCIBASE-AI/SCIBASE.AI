"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { evaluatePortfolio } = require("../src/grant-portfolio-compliance");

const samplePath = path.join(__dirname, "..", "data", "sample-grant-portfolio.json");
const portfolio = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const result = evaluatePortfolio(portfolio);

console.log(`Enterprise grant portfolio compliance demo for ${result.institution.name}`);
console.log(`As of ${result.asOf}: ${result.summary.readyForExport} ready, ${result.summary.needsReview} needs review, ${result.summary.blocked} blocked`);
console.log(`Average score: ${result.summary.averageComplianceScore}`);

for (const grant of result.grants) {
  console.log(
    `${grant.grantId}: ${grant.exportReadiness.decision} score=${grant.complianceScore} blockers=${grant.obligationCounts.blocker} warnings=${grant.obligationCounts.warning}`
  );
}

console.log(`Signed event sample: ${result.events[0].grantId} digest=${result.events[0].digest.slice(0, 16)} signature=${result.events[0].signature.slice(0, 16)}`);
