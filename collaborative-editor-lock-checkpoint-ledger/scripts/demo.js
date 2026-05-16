"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { evaluateCollaborationLedger } = require("../src/lock-checkpoint-ledger");

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "sample-collaboration-ledger.json"), "utf8"));
const result = evaluateCollaborationLedger(sample);

console.log("Collaborative editor lock checkpoint demo");
console.log(
  `As of ${result.asOf}: ${result.summary.ready} ready, ${result.summary.needs_review} needs review, ${result.summary.blocked} blocked`
);
console.log(`Findings: ${result.summary.blockers} blockers, ${result.summary.reviews} review items`);

for (const document of result.documents) {
  const topRisk = document.findings[0] ? `${document.findings[0].scope}: ${document.findings[0].message}` : "no open risks";
  console.log(
    `${document.documentId}: ${document.recoveryStatus} checkpointAge=${document.latestCheckpointAgeMinutes}m blockers=${document.actionCounts.blocker} reviews=${document.actionCounts.review}`
  );
  console.log(`  top risk: ${topRisk}`);
}

const sampleEvent = result.signedAuditEvents[0];
console.log(`Signed audit event: ${sampleEvent.payload.documentId} digest=${sampleEvent.digest.slice(0, 12)} signature=${sampleEvent.signature.slice(0, 12)}`);
