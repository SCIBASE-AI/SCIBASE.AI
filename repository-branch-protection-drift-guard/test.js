const assert = require("assert");
const { evaluateBranchProtection } = require("./branchProtectionGuard");
const sampleRepository = require("./sampleRepository");

const result = evaluateBranchProtection(sampleRepository);

assert.equal(result.decision, "block-release-export");
assert.ok(result.findings.some((finding) => finding.id === "missing-status-checks:release/v1.2-dataset"));
assert.ok(result.findings.some((finding) => finding.id === "review-count-drift:release/v1.2-dataset"));
assert.ok(result.findings.some((finding) => finding.id === "signed-commit-drift:release/v1.2-dataset"));
assert.ok(result.findings.some((finding) => finding.id === "destructive-branch-setting:release/v1.2-dataset"));
assert.ok(result.findings.some((finding) => finding.id === "admin-bypass:release/v1.2-dataset"));
assert.ok(result.findings.some((finding) => finding.id === "export-on-drifted-branch:export-v1.2"));

const clean = evaluateBranchProtection({
  id: "clean-repo",
  branches: [
    {
      name: "release/v1.0",
      releaseCandidate: true,
      requiredStatusChecks: ["reproducibility-pipeline", "citation-metadata", "export-manifest"],
      requiredApprovingReviews: 2,
      requireSignedCommits: true,
      allowForcePushes: false,
      allowDeletions: false,
      allowAdminBypass: false
    }
  ],
  exportBundles: [{ id: "export-clean", branch: "release/v1.0", status: "ready" }]
});

assert.equal(clean.decision, "ready-for-release-export");
assert.equal(clean.findings.length, 0);

console.log("branch protection drift guard tests passed");
