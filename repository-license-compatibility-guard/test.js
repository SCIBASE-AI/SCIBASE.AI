const assert = require("node:assert/strict");
const {
  CONFLICT,
  HOLD,
  NOTICE_REQUIRED,
  PUBLISHABLE,
  analyzeRepositoryLicenses,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
} = require("./index");
const { sampleRepositoryLicensePacket } = require("./sample-data");

const result = analyzeRepositoryLicenses(sampleRepositoryLicensePacket);

assert.equal(result.totals.totalAssets, 7);
assert.equal(result.totals.releaseBlockingAssets, 3);
assert.equal(result.totals.byStatus[PUBLISHABLE], 2);
assert.equal(result.totals.byStatus[NOTICE_REQUIRED], 2);
assert.equal(result.totals.byStatus[CONFLICT], 1);
assert.equal(result.totals.byStatus[HOLD], 2);

const commercialConflict = result.decisions.find((decision) => decision.id === "asset-training-table");
assert.equal(commercialConflict.status, CONFLICT);
assert.match(commercialConflict.reasons.join(" "), /non-commercial license/);

const missingLicense = result.decisions.find((decision) => decision.id === "asset-raw-supplement");
assert.equal(missingLicense.status, HOLD);
assert.equal(missingLicense.releaseBlocking, true);

const gplNotebook = result.decisions.find((decision) => decision.id === "asset-notebook");
assert.equal(gplNotebook.status, NOTICE_REQUIRED);

assert.equal(createAuditDigest(result), result.auditDigest);
assert.match(renderMarkdownReport(result), /Repository License Compatibility Guard/);
assert.match(renderSvgSummary(result), /Blocking 3/);

assert.throws(
  () => analyzeRepositoryLicenses({ release: {}, assets: [] }),
  /missing required release field: repositoryId/
);

console.log("repository license compatibility guard tests passed");
