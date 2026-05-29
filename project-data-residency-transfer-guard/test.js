const assert = require("assert");

const { evaluateResidencyTransfers, evaluateScenario, isSensitive } = require("./index");
const { scenarios } = require("./sample-data");

assert.strictEqual(isSensitive("restricted-human-genomic"), true);
assert.strictEqual(isSensitive("public-metadata"), false);

const euExport = evaluateScenario(scenarios[0]);
assert.strictEqual(euExport.decision, "blocked");
assert(euExport.findings.some((finding) => finding.code === "missing-cross-region-dpa"));
assert(euExport.findings.some((finding) => finding.code === "active-export-embargo"));
assert(euExport.findings.some((finding) => finding.code === "missing-data-steward-approval"));

const publicMetadata = evaluateScenario(scenarios[1]);
assert.strictEqual(publicMetadata.decision, "approved");
assert(publicMetadata.findings.some((finding) => finding.code === "public-metadata-safe"));

const expiredDua = evaluateScenario(scenarios[2]);
assert.strictEqual(expiredDua.decision, "blocked");
assert(expiredDua.findings.some((finding) => finding.code === "expired-data-use-agreement"));

const sameInstitution = evaluateScenario(scenarios[3]);
assert.strictEqual(sameInstitution.decision, "approved");
assert.strictEqual(sameInstitution.crossRegion, false);
assert.strictEqual(sameInstitution.externalInstitution, false);

const report = evaluateResidencyTransfers(scenarios);
assert.deepStrictEqual(report.summary, {
  total: 4,
  approved: 2,
  needs_review: 0,
  blocked: 2,
  findingCount: 5,
});
assert.match(report.reportDigest, /^[0-9a-f]{64}$/);
assert(report.decisions.every((decision) => /^[0-9a-f]{64}$/.test(decision.auditDigest)));

console.log("project-data-residency-transfer-guard tests passed");
