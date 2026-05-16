"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  assessLocalCaches,
  assessPendingOperations,
  decideRecoveryStatus,
  digest,
  evaluateCollaborationLedger,
  signAuditEvent,
  stableStringify
} = require("../src/lock-checkpoint-ledger");

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "sample-collaboration-ledger.json"), "utf8"));

test("summarizes lock and checkpoint recovery states", () => {
  const result = evaluateCollaborationLedger(sample);

  assert.equal(result.summary.totalDocuments, 3);
  assert.equal(result.summary.ready, 1);
  assert.equal(result.summary.needs_review, 1);
  assert.equal(result.summary.blocked, 1);
  assert.ok(result.summary.blockers >= 6);
  assert.ok(result.summary.reviews >= 2);
  assert.equal(result.signedAuditEvents.length, 3);
});

test("keeps a recently checkpointed finalizing document restore ready", () => {
  const result = evaluateCollaborationLedger(sample);
  const document = result.documents.find((candidate) => candidate.documentId === "doc-neuro-submission");

  assert.equal(document.recoveryStatus, "ready");
  assert.equal(document.actionCounts.blocker, 0);
  assert.equal(document.actionCounts.review, 0);
  assert.equal(document.restorePlan.canRestoreSafely, true);
  assert.equal(document.latestCheckpointAgeMinutes, 2);
});

test("blocks stale locks, locked-section edits, and invalid checkpoints", () => {
  const result = evaluateCollaborationLedger(sample);
  const document = result.documents.find((candidate) => candidate.documentId === "doc-figure-appendix");

  assert.equal(document.recoveryStatus, "blocked");
  assert.ok(document.findings.some((finding) => finding.scope === "stale-lock"));
  assert.ok(document.findings.some((finding) => finding.scope === "locked-section-edit"));
  assert.ok(document.findings.some((finding) => finding.scope === "checkpoint-integrity"));
  assert.ok(document.findings.some((finding) => finding.scope === "blocking-comment"));
  assert.equal(document.restorePlan.canRestoreSafely, false);
});

test("marks delayed cache sync as review when no blocker is present", () => {
  const result = evaluateCollaborationLedger(sample);
  const document = result.documents.find((candidate) => candidate.documentId === "doc-methods-draft");

  assert.equal(document.recoveryStatus, "needs_review");
  assert.equal(document.actionCounts.blocker, 0);
  assert.ok(document.findings.some((finding) => finding.scope === "autosave"));
  assert.ok(document.findings.some((finding) => finding.scope === "named-version"));
});

test("individual assessors catch non-owner edits and autosave risk", () => {
  const locks = new Map([["figure", { ownerId: "u-owner" }]]);
  const operations = [{ operationId: "op-x", userId: "u-other", sectionId: "figure" }];
  const caches = [{ clientId: "browser-x", userId: "u-other", lastSyncedAt: "2026-05-16T11:00:00.000Z", unsyncedOperations: 10 }];
  const policy = { autosaveReviewMinutes: 5, autosaveBlockerMinutes: 30, maxUnsyncedOperations: 8 };

  assert.equal(assessPendingOperations(operations, locks)[0].severity, "blocker");
  assert.equal(assessLocalCaches(caches, policy, new Date("2026-05-16T12:00:00.000Z"))[0].severity, "blocker");
  assert.equal(decideRecoveryStatus({ blocker: 1, review: 0, note: 0 }), "blocked");
});

test("signs audit events deterministically", () => {
  const payload = {
    type: "collaborative_editor.lock_checkpoint.evaluated",
    documentId: "doc-neuro-submission",
    recoveryStatus: "ready"
  };
  const first = signAuditEvent(payload, "test-secret");
  const second = signAuditEvent(
    {
      recoveryStatus: "ready",
      documentId: "doc-neuro-submission",
      type: "collaborative_editor.lock_checkpoint.evaluated"
    },
    "test-secret"
  );

  assert.equal(first.digest, second.digest);
  assert.equal(first.signature, second.signature);
  assert.equal(digest(payload).length, 64);
  assert.equal(stableStringify({ b: 2, a: 1 }), "{\"a\":1,\"b\":2}");
});
