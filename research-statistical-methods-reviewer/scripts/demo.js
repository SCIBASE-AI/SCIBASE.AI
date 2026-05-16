"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { evaluateReviewDocket } = require("../src/statistical-methods-reviewer");

const samplePath = path.join(__dirname, "..", "data", "sample-review-docket.json");
const sample = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const result = evaluateReviewDocket(sample);

console.log("Statistical methods review assistant demo");
console.log(
  `As of ${result.asOf}: ${result.summary.ready} ready, ${result.summary.needs_review} needs review, ${result.summary.blocked} blocked`
);
console.log(
  `Findings: ${result.summary.blockers} blockers, ${result.summary.reviews} review items; average rigor score ${result.summary.averageRigorScore}`
);

for (const manuscript of result.manuscripts) {
  const firstRisk = manuscript.findings[0] ? `${manuscript.findings[0].scope}: ${manuscript.findings[0].message}` : "no open risks";
  console.log(
    `${manuscript.manuscriptId}: ${manuscript.reviewStatus} score=${manuscript.rigorScore} blockers=${manuscript.actionCounts.blocker} reviews=${manuscript.actionCounts.review}`
  );
  console.log(`  top risk: ${firstRisk}`);
}

const samplePacket = result.signedReviewPackets[0];
console.log(`Signed review packet: ${samplePacket.payload.manuscriptId} digest=${samplePacket.digest.slice(0, 12)} signature=${samplePacket.signature.slice(0, 12)}`);
