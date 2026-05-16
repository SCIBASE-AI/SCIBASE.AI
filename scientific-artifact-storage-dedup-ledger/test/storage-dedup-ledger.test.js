"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  buildBlobInventory,
  daysSince,
  digest,
  evaluateStorageBook,
  signAuditEvent,
  stableStringify
} = require("../src/storage-dedup-ledger");

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "sample-storage-book.json"), "utf8"));

test("summarizes storage decisions and deduplication savings", () => {
  const result = evaluateStorageBook(sample);

  assert.equal(result.summary.totalProjects, 3);
  assert.equal(result.summary.ready, 0);
  assert.equal(result.summary.needsReview, 2);
  assert.equal(result.summary.blocked, 1);
  assert.equal(result.summary.dedupSavingsBytes, 734003200);
  assert.equal(result.summary.dedupSavingsPercent, 21);
});

test("builds content-addressed blob inventory from duplicate artifacts", () => {
  const project = sample.projects.find((candidate) => candidate.projectId === "proj-neuro-atlas");
  const blobs = buildBlobInventory(project.artifacts);
  const duplicateBlob = blobs.find((blob) => blob.contentHash === "sha256:cohort-a");

  assert.equal(blobs.length, 2);
  assert.equal(duplicateBlob.references.length, 2);
  assert.equal(duplicateBlob.duplicateReferences, 1);
  assert.equal(duplicateBlob.savingsBytes, 314572800);
});

test("routes large artifacts and stale previews to review", () => {
  const result = evaluateStorageBook(sample);
  const climate = result.projects.find((candidate) => candidate.projectId === "proj-climate-forecast");

  assert.equal(climate.storageDecision, "needs_review");
  assert.equal(climate.dedupSavingsBytes, 419430400);
  assert.equal(climate.actionCounts.review, 1);
  assert.ok(climate.actions.some((action) => action.scope === "preview"));
  assert.ok(climate.tierPlan.some((tier) => tier.artifactId === "climate-notebook" && tier.tier === "hot"));
});

test("blocks over-quota projects with missing hash evidence", () => {
  const result = evaluateStorageBook(sample);
  const quantum = result.projects.find((candidate) => candidate.projectId === "proj-quantum-traces");

  assert.equal(quantum.storageDecision, "blocked");
  assert.equal(quantum.actionCounts.blocker, 2);
  assert.equal(quantum.actionCounts.review, 2);
  assert.ok(quantum.actions.some((action) => action.scope === "content-hash"));
  assert.ok(quantum.actions.some((action) => action.scope === "quota"));
  assert.ok(quantum.tierPlan.some((tier) => tier.tier === "cold"));
});

test("signs audit events deterministically", () => {
  const payload = {
    type: "artifact.storage_dedup.evaluated",
    projectId: "proj-climate-forecast",
    storageDecision: "needs_review"
  };
  const first = signAuditEvent(payload, "test-secret");
  const second = signAuditEvent(
    {
      storageDecision: "needs_review",
      projectId: "proj-climate-forecast",
      type: "artifact.storage_dedup.evaluated"
    },
    "test-secret"
  );

  assert.equal(first.digest, second.digest);
  assert.equal(first.signature, second.signature);
  assert.equal(digest(payload).length, 64);
  assert.equal(stableStringify({ b: 2, a: 1 }), "{\"a\":1,\"b\":2}");
  assert.equal(daysSince(new Date("2026-05-16T00:00:00.000Z"), "2026-05-01"), 15);
});
