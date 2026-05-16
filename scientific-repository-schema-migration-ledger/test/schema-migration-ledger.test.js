"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  digest,
  evaluateMigrationBook,
  isSemver,
  signAttestation,
  stableStringify
} = require("../src/schema-migration-ledger");

const sample = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "data", "sample-repository-migrations.json"), "utf8")
);

test("summarizes repository schema migration decisions", () => {
  const result = evaluateMigrationBook(sample);

  assert.equal(result.summary.totalRepositories, 3);
  assert.equal(result.summary.ready, 1);
  assert.equal(result.summary.needsReview, 1);
  assert.equal(result.summary.blocked, 1);
  assert.equal(result.summary.majorImpact, 2);
  assert.equal(result.summary.minorImpact, 1);
  assert.deepEqual(result.adminMetrics.exportReadyRepositoryIds, ["repo-climate-model"]);
});

test("blocks migrations that would lose citation and fork attribution", () => {
  const result = evaluateMigrationBook(sample);
  const repository = result.repositories.find((candidate) => candidate.repositoryId === "repo-neuro-atlas");

  assert.equal(repository.migrationDecision, "blocked");
  assert.equal(repository.semanticImpact, "major");
  assert.equal(repository.checkCounts.blocker, 2);
  assert.equal(repository.checkCounts.review, 4);
  assert.ok(repository.checks.some((check) => check.scope === "doi"));
  assert.ok(repository.checks.some((check) => check.scope === "fork-attribution"));
  assert.equal(repository.rollbackPlan.required, true);
});

test("marks complete metadata migrations as ready for export", () => {
  const result = evaluateMigrationBook(sample);
  const repository = result.repositories.find((candidate) => candidate.repositoryId === "repo-climate-model");

  assert.equal(repository.migrationDecision, "ready");
  assert.equal(repository.semanticImpact, "minor");
  assert.equal(repository.checkCounts.blocker, 0);
  assert.equal(repository.checkCounts.review, 0);
  assert.equal(repository.compatibilityPacket.exportTargets[0], "Zenodo");
  assert.equal(repository.compatibilityPacket.packetDigest.length, 64);
});

test("keeps deprecated-field migrations in review with rollback notes", () => {
  const result = evaluateMigrationBook(sample);
  const repository = result.repositories.find((candidate) => candidate.repositoryId === "repo-quantum-traces");

  assert.equal(repository.migrationDecision, "needs_review");
  assert.equal(repository.semanticImpact, "major");
  assert.equal(repository.checkCounts.blocker, 0);
  assert.equal(repository.checkCounts.review, 2);
  assert.equal(repository.rollbackPlan.required, true);
  assert.ok(repository.compatibilityPacket.reviewTitles.some((title) => title.includes("deprecated")));
});

test("signs migration attestations deterministically", () => {
  const payload = {
    type: "repository.metadata_schema_migration.evaluated",
    repositoryId: "repo-climate-model",
    migrationDecision: "ready"
  };
  const first = signAttestation(payload, "test-secret");
  const second = signAttestation(
    {
      migrationDecision: "ready",
      repositoryId: "repo-climate-model",
      type: "repository.metadata_schema_migration.evaluated"
    },
    "test-secret"
  );

  assert.equal(first.digest, second.digest);
  assert.equal(first.signature, second.signature);
  assert.equal(first.digest.length, 64);
  assert.equal(digest(payload).length, 64);
  assert.equal(stableStringify({ b: 2, a: 1 }), "{\"a\":1,\"b\":2}");
  assert.equal(isSemver("1.2.3"), true);
  assert.equal(isSemver("preprint-v2"), false);
});
