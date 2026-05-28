const assert = require("assert");
const {
  auditDeletionEscrow,
  digest,
  hoursBetween,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const {
  auditPolicy,
  readyProject,
  readyRequest,
  riskyProject,
  riskyRequest,
} = require("./sample-data");

const risky = auditDeletionEscrow(riskyProject, riskyRequest, auditPolicy);
assert.strictEqual(risky.decision, "block-destructive-project-action");
assert.ok(risky.riskScore >= 90, "risky deletion should produce a strong block score");
assert.ok(risky.findings.some((item) => item.code === "REQUESTER_LACKS_DESTRUCTIVE_ROLE"));
assert.ok(risky.findings.some((item) => item.code === "ESCROW_WINDOW_TOO_SHORT"));
assert.ok(risky.findings.some((item) => item.code === "ROLLBACK_CHECKPOINT_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "PRE_DELETE_EXPORT_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "DOI_TOMBSTONE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "COLLABORATOR_NOTICE_MISSING"));
assert.ok(risky.findings.some((item) => item.code === "LEGAL_HOLD_ACTIVE"));
assert.ok(risky.findings.some((item) => item.code === "UNSETTLED_COMPUTE_CHARGES"));

const repeat = auditDeletionEscrow(riskyProject, riskyRequest, auditPolicy);
assert.strictEqual(risky.auditDigest, repeat.auditDigest, "audit digest must be deterministic");

const ready = auditDeletionEscrow(readyProject, readyRequest, auditPolicy);
assert.strictEqual(ready.decision, "ready-for-escrowed-execution");
assert.strictEqual(ready.findings.length, 0);

assert.strictEqual(hoursBetween("2026-05-28T00:00:00Z", "2026-05-29T12:00:00Z"), 36);
assert.strictEqual(digest({ b: 2, a: 1 }), digest({ a: 1, b: 2 }));

const markdown = renderMarkdownReport(risky);
assert.ok(markdown.includes("Project Deletion Escrow Audit"));
assert.ok(markdown.includes("Synthetic project administration data only"));
assert.ok(markdown.includes("block-destructive-project-action"));

const svg = renderSvgSummary(risky);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Project Deletion Escrow Audit"));

console.log("project-deletion-escrow-auditor tests passed");
