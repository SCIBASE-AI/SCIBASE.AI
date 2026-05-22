const assert = require("node:assert/strict");
const {
  APPROVED,
  HOLD,
  PRIVATE_REVIEW,
  REALLOCATE,
  analyzeEnterpriseUsage,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { sampleEnterpriseUsagePacket } = require("./sample-data");

const result = analyzeEnterpriseUsage(sampleEnterpriseUsagePacket);

assert.equal(result.totals.totalRecords, 7);
assert.equal(result.totals.totalAmountUsd, 1965);
assert.equal(result.totals.approvedAmountUsd, 715);
assert.equal(result.totals.heldAmountUsd, 940);
assert.equal(result.totals.reallocatedAmountUsd, 310);
assert.equal(result.totals.byStatus[APPROVED], 2);
assert.equal(result.totals.byStatus[HOLD], 2);
assert.equal(result.totals.byStatus[PRIVATE_REVIEW], 2);
assert.equal(result.totals.byStatus[REALLOCATE], 1);

const outsideWindow = result.decisions.find((decision) => decision.id === "usage-005");
assert.equal(outsideWindow.status, HOLD);
assert.match(outsideWindow.reasons.join(" "), /outside the grant funding window/);

const privateUsage = result.decisions.find((decision) => decision.id === "usage-002");
assert.equal(privateUsage.status, PRIVATE_REVIEW);
assert.match(privateUsage.actions.join(" "), /Suppress project title/);

const reallocated = result.decisions.find((decision) => decision.id === "usage-004");
assert.equal(reallocated.status, REALLOCATE);

assert.equal(createAuditDigest(result), result.auditDigest);
assert.match(renderMarkdownReport(result), /Enterprise Usage Cost Allocation Guard/);
assert.match(renderSvgSummary(result), /Approved \$715.00/);

assert.throws(
  () => analyzeEnterpriseUsage({ labs: [], grants: [], usageRecords: [{}] }),
  /missing required usage field: id/
);

console.log("enterprise usage cost allocation guard tests passed");
