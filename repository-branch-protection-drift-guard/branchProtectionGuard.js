const DEFAULT_REQUIRED_CHECKS = [
  "reproducibility-pipeline",
  "citation-metadata",
  "export-manifest"
];

function arrayDifference(required, actual) {
  const actualSet = new Set(actual || []);
  return required.filter((item) => !actualSet.has(item));
}

function addFinding(findings, severity, id, message, action, evidence = {}) {
  findings.push({ severity, id, message, action, evidence });
}

function evaluateBranchProtection(repository, policy = {}) {
  const requiredChecks = policy.requiredChecks || DEFAULT_REQUIRED_CHECKS;
  const minReviews = policy.minApprovingReviews || 2;
  const findings = [];

  for (const branch of repository.branches || []) {
    if (!branch.releaseCandidate) {
      continue;
    }

    const missingChecks = arrayDifference(requiredChecks, branch.requiredStatusChecks);
    if (missingChecks.length > 0) {
      addFinding(
        findings,
        "block",
        `missing-status-checks:${branch.name}`,
        `Release branch ${branch.name} is missing required status checks.`,
        "Restore the required release status checks before citation or export actions.",
        { branch: branch.name, missingChecks }
      );
    }

    if ((branch.requiredApprovingReviews || 0) < minReviews) {
      addFinding(
        findings,
        "hold",
        `review-count-drift:${branch.name}`,
        `Release branch ${branch.name} requires fewer than ${minReviews} approving reviews.`,
        "Reset branch protection to the project release-review baseline.",
        { branch: branch.name, requiredApprovingReviews: branch.requiredApprovingReviews, minReviews }
      );
    }

    if (!branch.requireSignedCommits) {
      addFinding(
        findings,
        "hold",
        `signed-commit-drift:${branch.name}`,
        `Release branch ${branch.name} does not require signed commits.`,
        "Require signed commits or attach a release-manager exception.",
        { branch: branch.name }
      );
    }

    if (branch.allowForcePushes || branch.allowDeletions) {
      addFinding(
        findings,
        "block",
        `destructive-branch-setting:${branch.name}`,
        `Release branch ${branch.name} allows force pushes or deletion.`,
        "Disable destructive branch settings before release or export.",
        { branch: branch.name, allowForcePushes: branch.allowForcePushes, allowDeletions: branch.allowDeletions }
      );
    }

    if (branch.allowAdminBypass && !branch.adminBypassExceptionId) {
      addFinding(
        findings,
        "hold",
        `admin-bypass:${branch.name}`,
        `Release branch ${branch.name} allows admin bypass without an exception record.`,
        "Attach the exception record or disable admin bypass.",
        { branch: branch.name }
      );
    }
  }

  for (const exportBundle of repository.exportBundles || []) {
    const branch = (repository.branches || []).find((candidate) => candidate.name === exportBundle.branch);
    if (!branch) {
      addFinding(
        findings,
        "block",
        `unknown-export-branch:${exportBundle.id}`,
        `Export bundle ${exportBundle.id} targets an unknown branch.`,
        "Point the export bundle at a known release candidate branch.",
        exportBundle
      );
      continue;
    }

    const branchFindingPrefix = `:${branch.name}`;
    const branchHasDrift = findings.some((finding) => finding.id.endsWith(branchFindingPrefix));
    if (branchHasDrift && exportBundle.status === "ready") {
      addFinding(
        findings,
        "block",
        `export-on-drifted-branch:${exportBundle.id}`,
        `Export bundle ${exportBundle.id} is marked ready while branch ${branch.name} has protection drift.`,
        "Hold export until branch protection drift is resolved.",
        exportBundle
      );
    }
  }

  const blockers = findings.filter((finding) => finding.severity === "block").length;
  const holds = findings.filter((finding) => finding.severity === "hold").length;

  return {
    repositoryId: repository.id,
    decision: blockers > 0 ? "block-release-export" : holds > 0 ? "hold-for-release-manager" : "ready-for-release-export",
    summary: {
      branches: (repository.branches || []).length,
      exportBundles: (repository.exportBundles || []).length,
      blockers,
      holds,
      findings: findings.length
    },
    findings
  };
}

function toMarkdown(result) {
  const rows = result.findings.map((finding) => `| ${finding.severity} | ${finding.message} | ${finding.action} |`);
  return [
    "# Branch Protection Drift Guard Report",
    "",
    `Repository: ${result.repositoryId}`,
    `Decision: ${result.decision}`,
    "",
    "| Severity | Finding | Action |",
    "| --- | --- | --- |",
    ...(rows.length ? rows : ["| ok | No branch-protection drift found. | Release/export may continue. |"]),
    ""
  ].join("\n");
}

function toSvg(result) {
  const color = result.decision === "ready-for-release-export" ? "#0f7b45" : result.decision === "hold-for-release-manager" ? "#9a6700" : "#b42318";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="220" viewBox="0 0 760 220" role="img" aria-label="Branch protection drift guard summary">`,
    `<rect width="760" height="220" fill="#f8fafc"/>`,
    `<rect x="30" y="28" width="700" height="164" rx="8" fill="#ffffff" stroke="#d0d7de"/>`,
    `<text x="54" y="72" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827">Branch Protection Drift Guard</text>`,
    `<text x="54" y="112" font-family="Arial, sans-serif" font-size="18" fill="${color}">Decision: ${result.decision}</text>`,
    `<text x="54" y="146" font-family="Arial, sans-serif" font-size="16" fill="#374151">Blockers: ${result.summary.blockers} | Holds: ${result.summary.holds} | Findings: ${result.summary.findings}</text>`,
    `<text x="54" y="174" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">Repository ${result.repositoryId}</text>`,
    `</svg>`
  ].join("\n");
}

module.exports = {
  evaluateBranchProtection,
  toMarkdown,
  toSvg
};
