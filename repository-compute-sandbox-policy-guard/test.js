const assert = require("node:assert/strict");
const {
  createPolicyReport,
  evaluateRepositoryComputePolicy,
  renderMarkdown,
  renderSvg,
} = require("./index");
const { sampleCandidates } = require("./sample-data");

const ready = evaluateRepositoryComputePolicy(sampleCandidates[0]);
assert.equal(ready.status, "ready");
assert.equal(ready.releaseActions.allowProtectedMerge, true);
assert.equal(ready.releaseActions.allowDoiPublication, true);
assert.equal(ready.summary.blockingIssues, 0);

const blocked = evaluateRepositoryComputePolicy(sampleCandidates[1]);
assert.equal(blocked.status, "blocked");
assert.equal(blocked.releaseActions.allowExportBundle, false);
assert.ok(
  blocked.issues.some((issue) => issue.code === "SANDBOX_IMAGE_NOT_PINNED"),
);
assert.ok(
  blocked.issues.some((issue) => issue.code === "NETWORK_EGRESS_TOO_BROAD"),
);
assert.ok(
  blocked.issues.some((issue) => issue.code === "COMPUTE_BUDGET_EXCEEDED"),
);
assert.ok(
  blocked.issues.some(
    (issue) => issue.code === "WRITABLE_MOUNT_NOT_CONSTRAINED",
  ),
);
assert.ok(
  blocked.issues.some(
    (issue) => issue.code === "EXPECTED_ARTIFACT_HASH_MISSING",
  ),
);

const needsReview = evaluateRepositoryComputePolicy(sampleCandidates[2]);
assert.equal(needsReview.status, "needs_review");
assert.equal(needsReview.releaseActions.allowProtectedMerge, true);
assert.equal(needsReview.releaseActions.allowDoiPublication, false);
assert.equal(needsReview.releaseActions.requiresReviewerSignoff, true);
assert.ok(
  needsReview.issues.some((issue) => issue.code === "GPU_REVIEW_REQUIRED"),
);

const report = createPolicyReport(sampleCandidates);
assert.deepEqual(report.totals, {
  candidates: 3,
  ready: 1,
  needsReview: 1,
  blocked: 1,
  blockingIssues: 11,
  warnings: 1,
});

const markdown = renderMarkdown(report);
assert.match(markdown, /Repository Compute Sandbox Policy Guard/);
assert.match(markdown, /NETWORK_EGRESS_TOO_BROAD/);
assert.match(markdown, /DOI and export blocking actions/);

const svg = renderSvg(report);
assert.match(svg, /<svg/);
assert.match(svg, /sleep-spindle-atlas/);
assert.match(svg, /blocked/);

assert.throws(
  () => evaluateRepositoryComputePolicy({ repositoryId: "missing/pipelines" }),
  /candidate.tag is required/,
);

console.log("repository-compute-sandbox-policy-guard tests passed");
