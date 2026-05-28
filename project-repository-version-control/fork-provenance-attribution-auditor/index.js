"use strict";

const crypto = require("crypto");

const WEIGHTS = {
  critical: 26,
  high: 18,
  medium: 10,
  low: 5,
};

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || "medium",
    recommendation: recommendationFor(finding.code),
    ...finding,
  });
}

function recommendationFor(code) {
  const recommendations = {
    FORK_PARENT_MISSING: "Attach the upstream project and commit before allowing publication.",
    ATTRIBUTION_DROPPED: "Restore contributor attribution from the upstream fork lineage.",
    MERGE_BASE_AMBIGUOUS: "Require a single merge base or explicit conflict-resolution provenance.",
    DOI_VERSION_DRIFT: "Reissue or correct DOI metadata for the tagged repository version.",
    EXPORT_MANIFEST_HASH_MISMATCH: "Regenerate the export manifest from the committed files.",
    DERIVATION_LICENSE_CONFLICT: "Block export until derivative licensing is compatible with upstream terms.",
    UNREVIEWED_PROVENANCE_REWRITE: "Require maintainer review for history rewrites affecting provenance.",
    CITATION_BADGE_STALE: "Regenerate citation badge metadata from the latest tagged version.",
    ORPHANED_FORK: "Mark the fork as experimental until upstream lineage is resolved.",
  };
  return recommendations[code] || "Route this item for repository provenance review.";
}

function auditForkProvenance(repository) {
  const findings = [];
  const contributors = new Set((repository.contributors || []).map((contributor) => contributor.id));
  const upstreamContributors = new Set((repository.upstream?.contributors || []).map((contributor) => contributor.id));
  const commits = new Map((repository.commits || []).map((commit) => [commit.sha, commit]));
  const tags = new Map((repository.tags || []).map((tag) => [tag.name, tag]));

  if (repository.forkedFrom && !repository.upstream) {
    addFinding(findings, {
      code: "FORK_PARENT_MISSING",
      severity: "critical",
      message: "Repository declares fork lineage but has no upstream metadata.",
      evidence: { forkedFrom: repository.forkedFrom },
    });
  }

  for (const upstreamContributor of upstreamContributors) {
    if (!contributors.has(upstreamContributor)) {
      addFinding(findings, {
        code: "ATTRIBUTION_DROPPED",
        severity: "high",
        contributorId: upstreamContributor,
        message: `Upstream contributor ${upstreamContributor} is absent from derived repository attribution.`,
        evidence: { upstreamContributor },
      });
    }
  }

  for (const mergeRequest of repository.mergeRequests || []) {
    if (!mergeRequest.mergeBase || !commits.has(mergeRequest.mergeBase)) {
      addFinding(findings, {
        code: "MERGE_BASE_AMBIGUOUS",
        severity: "high",
        mergeRequestId: mergeRequest.id,
        message: `Merge request ${mergeRequest.id} has missing or unknown merge base ${mergeRequest.mergeBase || "none"}.`,
        evidence: mergeRequest,
      });
    }
    if (mergeRequest.historyRewrite && !mergeRequest.maintainerReviewId) {
      addFinding(findings, {
        code: "UNREVIEWED_PROVENANCE_REWRITE",
        severity: "critical",
        mergeRequestId: mergeRequest.id,
        message: `Merge request ${mergeRequest.id} rewrites history without maintainer provenance review.`,
        evidence: mergeRequest,
      });
    }
  }

  for (const tag of repository.tags || []) {
    const doi = (repository.dois || []).find((entry) => entry.tag === tag.name);
    if (!doi || doi.commitSha !== tag.commitSha || doi.metadataHash !== tag.metadataHash) {
      addFinding(findings, {
        code: "DOI_VERSION_DRIFT",
        severity: "high",
        tag: tag.name,
        message: `DOI metadata for ${tag.name} does not match tag commit or metadata hash.`,
        evidence: { tag, doi },
      });
    }
  }

  for (const exportBundle of repository.exportBundles || []) {
    const tag = tags.get(exportBundle.tag);
    const computedHash = computeManifestHash(exportBundle.files || []);
    if (exportBundle.manifestHash !== computedHash) {
      addFinding(findings, {
        code: "EXPORT_MANIFEST_HASH_MISMATCH",
        severity: "critical",
        exportId: exportBundle.id,
        message: `Export ${exportBundle.id} manifest hash ${exportBundle.manifestHash} does not match computed ${computedHash}.`,
        evidence: { exportBundle, computedHash },
      });
    }
    if (tag && exportBundle.commitSha !== tag.commitSha) {
      addFinding(findings, {
        code: "DOI_VERSION_DRIFT",
        severity: "medium",
        exportId: exportBundle.id,
        message: `Export ${exportBundle.id} points to ${exportBundle.commitSha} while tag ${tag.name} points to ${tag.commitSha}.`,
        evidence: { exportBundle, tag },
      });
    }
  }

  if (repository.upstream?.license && repository.license) {
    const compatible = isLicenseCompatible(repository.upstream.license, repository.license);
    if (!compatible) {
      addFinding(findings, {
        code: "DERIVATION_LICENSE_CONFLICT",
        severity: "critical",
        message: `Derived license ${repository.license} conflicts with upstream ${repository.upstream.license}.`,
        evidence: { upstream: repository.upstream.license, derived: repository.license },
      });
    }
  }

  if (repository.forkedFrom && (!repository.upstream || !repository.upstream.commitSha)) {
    addFinding(findings, {
      code: "ORPHANED_FORK",
      severity: "medium",
      message: "Fork has no resolvable upstream commit anchor.",
      evidence: { forkedFrom: repository.forkedFrom, upstream: repository.upstream },
    });
  }

  for (const badge of repository.citationBadges || []) {
    const tag = tags.get(badge.tag);
    if (!tag || badge.metadataHash !== tag.metadataHash) {
      addFinding(findings, {
        code: "CITATION_BADGE_STALE",
        severity: "medium",
        badgeId: badge.id,
        message: `Citation badge ${badge.id} is stale for tag ${badge.tag}.`,
        evidence: { badge, tag },
      });
    }
  }

  const riskScore = Math.min(100, findings.reduce((score, finding) => score + WEIGHTS[finding.severity], 0));
  const decision = riskScore >= 70 ? "hold-publication-export" : riskScore >= 35 ? "repair-provenance" : "provenance-ready";
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify(findings.map((finding) => [finding.code, finding.mergeRequestId, finding.exportId, finding.tag, finding.contributorId]).sort()))
    .digest("hex")
    .slice(0, 16);

  return {
    repository: {
      id: repository.id,
      title: repository.title,
      forkedFrom: repository.forkedFrom,
    },
    summary: {
      decision,
      riskScore,
      auditDigest,
      commitsReviewed: (repository.commits || []).length,
      mergeRequestsReviewed: (repository.mergeRequests || []).length,
      tagsReviewed: (repository.tags || []).length,
      exportBundlesReviewed: (repository.exportBundles || []).length,
      findings: findings.length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
    },
    findings,
    provenanceGates: [
      { gate: "Fork lineage points to an upstream project and commit.", passed: !findings.some((finding) => ["FORK_PARENT_MISSING", "ORPHANED_FORK"].includes(finding.code)) },
      { gate: "Derived repository preserves upstream contributor attribution.", passed: !findings.some((finding) => finding.code === "ATTRIBUTION_DROPPED") },
      { gate: "Merge requests have clear bases and reviewed history rewrites.", passed: !findings.some((finding) => ["MERGE_BASE_AMBIGUOUS", "UNREVIEWED_PROVENANCE_REWRITE"].includes(finding.code)) },
      { gate: "DOI, tag, citation, and export metadata agree.", passed: !findings.some((finding) => ["DOI_VERSION_DRIFT", "CITATION_BADGE_STALE", "EXPORT_MANIFEST_HASH_MISMATCH"].includes(finding.code)) },
      { gate: "Derivative license is compatible with upstream terms.", passed: !findings.some((finding) => finding.code === "DERIVATION_LICENSE_CONFLICT") },
    ],
  };
}

function computeManifestHash(files) {
  const payload = files
    .map((file) => `${file.path}:${file.sha256}`)
    .sort()
    .join("|");
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function isLicenseCompatible(upstream, derived) {
  const normalizedUpstream = String(upstream).toLowerCase();
  const normalizedDerived = String(derived).toLowerCase();
  if (normalizedUpstream === normalizedDerived) return true;
  if (normalizedUpstream.includes("mit") && ["mit", "apache-2.0", "bsd-3-clause"].includes(normalizedDerived)) return true;
  if (normalizedUpstream.includes("cc-by") && normalizedDerived.includes("cc-by")) return true;
  if (normalizedUpstream.includes("gpl") && normalizedDerived.includes("gpl")) return true;
  return false;
}

function renderMarkdownReport(report) {
  const lines = [
    `# Fork Provenance Attribution Audit: ${report.repository.title}`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Risk score: ${report.summary.riskScore}`,
    `- Commits reviewed: ${report.summary.commitsReviewed}`,
    `- Merge requests reviewed: ${report.summary.mergeRequestsReviewed}`,
    `- Tags reviewed: ${report.summary.tagsReviewed}`,
    `- Export bundles reviewed: ${report.summary.exportBundlesReviewed}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.code}`);
    lines.push(`  - ${finding.message}`);
    lines.push(`  - Recommendation: ${finding.recommendation}`);
  }

  lines.push("", "## Provenance Gates", "");
  for (const gate of report.provenanceGates) {
    lines.push(`- [${gate.passed ? "x" : "!"}] ${gate.gate}`);
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  auditForkProvenance,
  renderMarkdownReport,
  computeManifestHash,
  isLicenseCompatible,
};
