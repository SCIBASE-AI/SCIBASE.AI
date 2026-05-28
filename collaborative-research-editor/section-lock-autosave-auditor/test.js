"use strict";

const assert = require("assert");
const { auditCollaborationSession, renderMarkdownReport, rangesOverlap, minutesBetween } = require("./index");
const { manuscriptSession } = require("./sample-data");

assert.strictEqual(rangesOverlap({ start: 5, end: 10 }, { start: 9, end: 12 }), true);
assert.strictEqual(rangesOverlap({ start: 5, end: 10 }, { start: 10, end: 12 }), false);
assert.strictEqual(minutesBetween("2026-05-28T17:48:00Z", "2026-05-28T18:02:00Z"), 14);

const report = auditCollaborationSession(manuscriptSession);
const codes = new Set(report.findings.map((finding) => finding.code));

assert.strictEqual(report.summary.decision, "hold-collaboration-sync");
assert.strictEqual(report.summary.riskScore, 100);
assert.ok(report.summary.criticalFindings >= 3, "expected multiple critical lock/version findings");
assert.ok(codes.has("LOCKED_SECTION_EDIT"), "missing locked edit detection");
assert.ok(codes.has("LOCK_LEASE_EXPIRED"), "missing expired lock detection");
assert.ok(codes.has("UNAUTHORIZED_UNLOCK"), "missing unauthorized unlock detection");
assert.ok(codes.has("AUTOSAVE_GAP"), "missing autosave lag detection");
assert.ok(codes.has("VERSION_PARENT_MISSING"), "missing version parent validation");
assert.ok(codes.has("RESTORE_OVERWRITES_UNSAVED"), "missing restore overwrite validation");
assert.ok(codes.has("CURSOR_ON_LOCKED_REGION"), "missing locked cursor presence state");
assert.ok(codes.has("OFFLINE_EDIT_CONFLICT"), "missing offline lock conflict");
assert.ok(codes.has("NAMED_VERSION_WITH_DIRTY_STATE"), "missing named-version dirty-state guard");

const repeat = auditCollaborationSession(manuscriptSession);
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "audit digest should be deterministic");

const markdown = renderMarkdownReport(report);
assert.ok(markdown.includes("Section Lock Autosave Audit"));
assert.ok(markdown.includes("hold-collaboration-sync"));
assert.ok(markdown.includes(report.summary.auditDigest));

console.log("section-lock-autosave-auditor tests passed");
