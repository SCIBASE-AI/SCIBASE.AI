const assert = require("assert");

const { embargoDays, evaluateJob, evaluateSyncJobs } = require("./index");
const { syncJobs } = require("./sample-data");

assert.strictEqual(embargoDays("2026-06-15"), 17);
assert.strictEqual(embargoDays(null), 0);

const overdue = evaluateJob(syncJobs[0]);
assert.strictEqual(overdue.decision, "blocked");
assert(overdue.findings.some((finding) => finding.code === "mandate-deadline-missed"));
assert(overdue.findings.some((finding) => finding.code === "sync-backlog-risk"));
assert(overdue.findings.some((finding) => finding.code === "webhook-delivery-failed"));

const metadataGap = evaluateJob(syncJobs[1]);
assert.strictEqual(metadataGap.decision, "blocked");
assert(metadataGap.findings.some((finding) => finding.code === "metadata-incomplete"));
assert(metadataGap.findings.some((finding) => finding.code === "low-orcid-coverage"));

const ready = evaluateJob(syncJobs[2]);
assert.strictEqual(ready.decision, "ready");
assert.strictEqual(ready.escalation, "release-to-sync-worker");

const embargoed = evaluateJob(syncJobs[3]);
assert.strictEqual(embargoed.decision, "blocked");
assert(embargoed.findings.some((finding) => finding.code === "active-embargo"));

const report = evaluateSyncJobs(syncJobs);
assert.deepStrictEqual(report.summary, {
  total: 4,
  ready: 1,
  needs_review: 0,
  blocked: 3,
  findingCount: 7,
});
assert.match(report.reportDigest, /^[0-9a-f]{64}$/);
assert(report.decisions.every((decision) => /^[0-9a-f]{64}$/.test(decision.auditDigest)));

console.log("institutional-repository-sync-sla-guard tests passed");
