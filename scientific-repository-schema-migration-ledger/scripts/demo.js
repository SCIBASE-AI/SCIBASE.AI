"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { evaluateMigrationBook } = require("../src/schema-migration-ledger");

const samplePath = path.join(__dirname, "..", "data", "sample-repository-migrations.json");
const book = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const result = evaluateMigrationBook(book);

console.log(`Scientific repository schema migration demo targeting ${result.targetSchema}`);
console.log(`As of ${result.asOf}: ${result.summary.ready} ready, ${result.summary.needsReview} needs review, ${result.summary.blocked} blocked`);
console.log(`Semantic impact: ${result.summary.majorImpact} major, ${result.summary.minorImpact} minor, ${result.summary.patchImpact} patch`);

for (const repository of result.repositories) {
  console.log(
    `${repository.repositoryId}: ${repository.migrationDecision} ${repository.currentVersion}->${repository.targetVersion} impact=${repository.semanticImpact} blockers=${repository.checkCounts.blocker} reviews=${repository.checkCounts.review}`
  );
}

console.log(`Signed attestation sample: ${result.attestations[0].repositoryId} digest=${result.attestations[0].digest.slice(0, 16)} signature=${result.attestations[0].signature.slice(0, 16)}`);
