const assert = require("node:assert/strict");
const {
  ALLOW,
  BLOCK,
  THROTTLE,
  analyzeAnalyticsApiUsage,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { sampleAnalyticsApiPacket } = require("./sample-data");

const result = analyzeAnalyticsApiUsage(sampleAnalyticsApiPacket);

assert.equal(result.totals.totalRequests, 7);
assert.equal(result.totals.billableUnits, 120);
assert.equal(result.totals.byStatus[ALLOW], 1);
assert.equal(result.totals.byStatus[BLOCK], 4);
assert.equal(result.totals.byStatus[THROTTLE], 2);

const allowed = result.decisions.find((decision) => decision.id === "query-001");
assert.equal(allowed.status, ALLOW);
assert.equal(allowed.billableUnits, 120);

const datasetBlock = result.decisions.find((decision) => decision.id === "query-002");
assert.equal(datasetBlock.status, BLOCK);
assert.match(datasetBlock.reasons.join(" "), /not included/);

const cohortBlock = result.decisions.find((decision) => decision.id === "query-003");
assert.equal(cohortBlock.status, BLOCK);
assert.match(cohortBlock.reasons.join(" "), /anonymization threshold/);

const burstThrottle = result.decisions.find((decision) => decision.id === "query-004");
assert.equal(burstThrottle.status, THROTTLE);

const quotaThrottle = result.decisions.find((decision) => decision.id === "query-005");
assert.equal(quotaThrottle.status, THROTTLE);

const privateBlock = result.decisions.find((decision) => decision.id === "query-007");
assert.equal(privateBlock.status, BLOCK);
assert.match(privateBlock.reasons.join(" "), /private content/);

assert.equal(createAuditDigest(result), result.auditDigest);
assert.match(renderMarkdownReport(result), /Analytics API License Usage Guard/);
assert.match(renderSvgSummary(result), /Billable units 120/);

assert.throws(
  () => analyzeAnalyticsApiUsage({ licenses: [], requests: [{}] }),
  /missing required analytics request field: id/
);

console.log("analytics API license usage guard tests passed");
