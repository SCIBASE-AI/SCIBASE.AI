"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { evaluateStorageBook } = require("../src/storage-dedup-ledger");

const samplePath = path.join(__dirname, "..", "data", "sample-storage-book.json");
const book = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const result = evaluateStorageBook(book);

console.log("Scientific artifact storage deduplication demo");
console.log(`As of ${result.asOf}: ${result.summary.ready} ready, ${result.summary.needsReview} needs review, ${result.summary.blocked} blocked`);
console.log(`Logical bytes: ${result.summary.logicalBytes}; physical after dedup: ${result.summary.physicalBytesAfterDedup}; savings: ${result.summary.dedupSavingsBytes} (${result.summary.dedupSavingsPercent}%)`);

for (const project of result.projects) {
  console.log(
    `${project.projectId}: ${project.storageDecision} logical=${project.logicalBytes} physical=${project.physicalBytesAfterDedup} savings=${project.dedupSavingsBytes} blockers=${project.actionCounts.blocker} reviews=${project.actionCounts.review}`
  );
}

console.log(`Signed audit sample: ${result.auditEvents[0].projectId} digest=${result.auditEvents[0].digest.slice(0, 16)} signature=${result.auditEvents[0].signature.slice(0, 16)}`);
