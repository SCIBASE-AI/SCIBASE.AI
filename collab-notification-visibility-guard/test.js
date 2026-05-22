"use strict";

const assert = require("assert");
const { evaluateNotificationBatch, stableStringify } = require("./index");
const { sampleBatch } = require("./sample-data");

function findRoute(result, eventId, recipientId) {
  const route = result.routes.find((candidate) => candidate.eventId === eventId && candidate.recipientId === recipientId);
  assert(route, `Missing route ${eventId} -> ${recipientId}`);
  return route;
}

function assertNoSensitiveLeak(route) {
  const serialized = stableStringify(route.payload);
  assert(!serialized.includes("Dr. Lane"), "blinded reviewer identity leaked");
  assert(!serialized.includes("/restricted/nb-qc.ipynb"), "restricted notebook path leaked");
  assert(!serialized.includes("Methods - oncology cohort"), "private section title leaked");
  assert(!serialized.includes("Final R2 reply"), "private collaborator note leaked");
}

const result = evaluateNotificationBatch(sampleBatch);
const repeated = evaluateNotificationBatch(sampleBatch);

assert.strictEqual(result.summary.totalRoutes, 11);
assert.strictEqual(result.summary.deliver, 3);
assert.strictEqual(result.summary.sanitize, 5);
assert.strictEqual(result.summary.hold, 3);
assert.strictEqual(result.summary.drop, 0);
assert.strictEqual(result.auditDigest, repeated.auditDigest, "audit digest should be deterministic");

const editorReviewerNote = findRoute(result, "evt-reviewer-note", "ed-1");
assert.strictEqual(editorReviewerNote.action, "deliver");

const reviewerSelfNote = findRoute(result, "evt-reviewer-note", "rev-anon-2");
assert.strictEqual(reviewerSelfNote.action, "sanitize");
assert(reviewerSelfNote.reasons.includes("blinded-reviewer-identity-hidden"));
assertNoSensitiveLeak(reviewerSelfNote);

const authorReviewerNote = findRoute(result, "evt-reviewer-note", "author-1");
assert.strictEqual(authorReviewerNote.action, "hold");
assert(authorReviewerNote.reasons.includes("missing-scope:review:R2"));
assert(authorReviewerNote.reasons.includes("not-private-thread-participant"));
assertNoSensitiveLeak(authorReviewerNote);

const authorMethodsLock = findRoute(result, "evt-methods-lock", "author-1");
assert.strictEqual(authorMethodsLock.action, "sanitize");
assert(authorMethodsLock.reasons.includes("external-channel-requires-sanitized-digest"));
assert(authorMethodsLock.reasons.includes("private-section-title-hidden:methods"));
assertNoSensitiveLeak(authorMethodsLock);

const analystNotebook = findRoute(result, "evt-notebook-output", "analyst-1");
assert.strictEqual(analystNotebook.action, "sanitize");
assert(analystNotebook.reasons.includes("restricted-notebook-path-hidden:nb-qc"));
assertNoSensitiveLeak(analystNotebook);

const authorNotebook = findRoute(result, "evt-notebook-output", "author-1");
assert.strictEqual(authorNotebook.action, "sanitize");
assert(authorNotebook.reasons.includes("restricted-notebook-path-hidden:nb-qc"));
assertNoSensitiveLeak(authorNotebook);

const projectManagerExport = findRoute(result, "evt-export-digest", "pm-1");
assert.strictEqual(projectManagerExport.action, "sanitize");
assert(projectManagerExport.reasons.includes("external-channel-requires-sanitized-digest"));

const authorExport = findRoute(result, "evt-export-digest", "author-1");
assert.strictEqual(authorExport.action, "hold");
assert(authorExport.reasons.includes("missing-external-digest-receipt"));
assertNoSensitiveLeak(authorExport);

console.log("collab notification visibility guard tests passed");
