const assert = require("node:assert/strict");
const {
  APPROVED,
  APPROVE_WITH_REVIEW,
  DENIED,
  STEWARD_REVIEW,
  analyzeBreakGlassAccess,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { sampleBreakGlassPacket } = require("./sample-data");

const result = analyzeBreakGlassAccess(sampleBreakGlassPacket);

assert.equal(result.totals.totalRequests, 5);
assert.equal(result.totals.temporaryAccessGrants, 3);
assert.equal(result.totals.blockedOrReviewRequests, 2);
assert.equal(result.totals.byStatus[APPROVED], 2);
assert.equal(result.totals.byStatus[APPROVE_WITH_REVIEW], 1);
assert.equal(result.totals.byStatus[DENIED] || 0, 0);
assert.equal(result.totals.byStatus[STEWARD_REVIEW], 2);

const deniedViewer = result.decisions.find((decision) => decision.id === "bg-002");
assert.equal(deniedViewer.status, STEWARD_REVIEW);
assert.match(deniedViewer.reasons.join(" "), /not allowed/);
assert.match(deniedViewer.reasons.join(" "), /protected project data/);

const afterHours = result.decisions.find((decision) => decision.id === "bg-001");
assert.equal(afterHours.status, APPROVE_WITH_REVIEW);
assert.equal(afterHours.expiresInMinutes, 90);

const approvedOwner = result.decisions.find((decision) => decision.id === "bg-003");
assert.equal(approvedOwner.status, APPROVED);

const longExpiry = result.decisions.find((decision) => decision.id === "bg-004");
assert.equal(longExpiry.status, STEWARD_REVIEW);
assert.match(longExpiry.reasons.join(" "), /no longer than 120 minutes/);

assert.equal(createAuditDigest(result), result.auditDigest);
assert.match(renderMarkdownReport(result), /Project Break-Glass Access Guard/);
assert.match(renderSvgSummary(result), /Grants 3/);

assert.throws(
  () => analyzeBreakGlassAccess({ projects: [], requests: [{}] }),
  /missing required break-glass request field: id/
);

console.log("project break-glass access guard tests passed");
