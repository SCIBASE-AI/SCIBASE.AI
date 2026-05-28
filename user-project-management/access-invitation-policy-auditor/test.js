"use strict";

const assert = require("assert");
const { auditAccessPolicy, renderMarkdownReport, roleRank, daysBetween } = require("./index");
const { projectAccessPacket } = require("./sample-data");

assert.strictEqual(roleRank("owner") > roleRank("viewer"), true);
assert.strictEqual(daysBetween("2026-04-01T18:00:00Z", "2026-05-28T20:00:00Z"), 57);

const report = auditAccessPolicy(projectAccessPacket);
const codes = new Set(report.findings.map((finding) => finding.code));

assert.strictEqual(report.summary.decision, "hold-project-access");
assert.strictEqual(report.summary.riskScore, 100);
assert.ok(codes.has("EXPIRED_INVITE_ACTIVE"), "missing expired invite detection");
assert.ok(codes.has("ROLE_ESCALATION_WITHOUT_APPROVAL"), "missing role escalation detection");
assert.ok(codes.has("OBJECT_PERMISSION_BYPASS"), "missing object permission bypass detection");
assert.ok(codes.has("INSTITUTION_SCOPE_MISMATCH"), "missing institution domain validation");
assert.ok(codes.has("UNVERIFIED_IDENTITY_PRIVILEGE"), "missing verified identity privilege detection");
assert.ok(codes.has("ANONYMOUS_PRIVATE_ACCESS"), "missing anonymous private access detection");
assert.ok(codes.has("AUDIT_LOG_GAP"), "missing audit log gap detection");
assert.ok(codes.has("DATA_DOWNLOAD_NOT_RESTRICTED"), "missing restricted dataset deny detection");
assert.ok(codes.has("STALE_EXTERNAL_COLLABORATOR"), "missing stale collaborator detection");

const repeat = auditAccessPolicy(projectAccessPacket);
assert.strictEqual(report.summary.auditDigest, repeat.summary.auditDigest, "digest should be stable");

const markdown = renderMarkdownReport(report);
assert.ok(markdown.includes("Access Invitation Policy Audit"));
assert.ok(markdown.includes("hold-project-access"));
assert.ok(markdown.includes(report.summary.auditDigest));

console.log("access-invitation-policy-auditor tests passed");
