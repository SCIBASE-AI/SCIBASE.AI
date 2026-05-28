const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 32,
  high: 17,
  medium: 8,
  low: 3,
};

const REQUIRED_AREAS = [
  "manuscript",
  "data",
  "code",
  "notebooks",
  "results",
  "protocols",
  "metadata",
];

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function hashContent(content) {
  return crypto.createHash("sha256").update(String(content || "")).digest("hex");
}

function finding(severity, code, title, evidence, action) {
  return { severity, code, title, evidence, action };
}

function allFiles(project) {
  return Object.values(project.files || {}).flat();
}

function filesForArea(project, area) {
  return project.files?.[area] || [];
}

function verifyAreaCoverage(project) {
  const findings = [];
  REQUIRED_AREAS.forEach((area) => {
    if (!filesForArea(project, area).length) {
      findings.push(finding(
        area === "metadata" || area === "manuscript" ? "blocker" : "high",
        "REQUIRED_REPOSITORY_AREA_MISSING",
        "Required project repository area is missing",
        `${project.id} has no files in ${area}/.`,
        `Add at least one tracked artifact under ${area}/ before tagging this project version.`,
      ));
    }
  });
  return findings;
}

function verifyHashes(project) {
  const findings = [];
  allFiles(project).forEach((file) => {
    if (!file.sha256) {
      findings.push(finding(
        "blocker",
        "CONTENT_HASH_MISSING",
        "Tracked file is missing a content hash",
        `${file.path} has no sha256 digest.`,
        "Generate a sha256 digest for every tracked file before export or DOI minting.",
      ));
      return;
    }

    if (file.content !== undefined && file.sha256 !== hashContent(file.content)) {
      findings.push(finding(
        "blocker",
        "CONTENT_HASH_MISMATCH",
        "Tracked file hash does not match content",
        `${file.path} digest does not match the current content payload.`,
        "Recompute the manifest after the file is saved, or block the export as tampered/stale.",
      ));
    }
  });
  return findings;
}

function verifyLargeFilePolicy(project, policy) {
  const findings = [];
  const threshold = policy.gitLfsThresholdBytes || 50 * 1024 * 1024;
  allFiles(project).forEach((file) => {
    if ((file.sizeBytes || 0) >= threshold && !file.gitLfs) {
      findings.push(finding(
        "high",
        "LARGE_FILE_NOT_IN_LFS",
        "Large artifact is not marked for Git LFS",
        `${file.path} is ${file.sizeBytes} bytes and exceeds the LFS threshold.`,
        "Store large datasets, notebooks with embedded outputs, and model artifacts through Git LFS.",
      ));
    }
  });
  return findings;
}

function verifyMetadata(project) {
  const findings = [];
  const metadata = project.metadata || {};

  if (!metadata.title || !metadata.authors?.length) {
    findings.push(finding(
      "blocker",
      "CITATION_METADATA_INCOMPLETE",
      "Citation metadata is incomplete",
      `${project.id} is missing a title or author list.`,
      "Collect title, author, ORCID, affiliation, and citation metadata before public tagging.",
    ));
  }

  if (!metadata.schemaOrgType || metadata.schemaOrgType !== "ScholarlyArticle") {
    findings.push(finding(
      "medium",
      "SCHEMA_ORG_TYPE_MISSING",
      "schema.org metadata type is missing or unexpected",
      `${project.id} schemaOrgType=${metadata.schemaOrgType || "missing"}.`,
      "Add schema.org ScholarlyArticle metadata to improve discoverability and export quality.",
    ));
  }

  (metadata.authors || []).forEach((author) => {
    if (!author.orcid) {
      findings.push(finding(
        "medium",
        "AUTHOR_ORCID_MISSING",
        "Author metadata lacks ORCID",
        `${author.name} has no ORCID in metadata.json.`,
        "Request ORCID or mark the author as externally unverified before DOI minting.",
      ));
    }
  });

  if (project.release?.public && !metadata.doi) {
    findings.push(finding(
      "high",
      "PUBLIC_RELEASE_WITHOUT_DOI",
      "Public release lacks DOI metadata",
      `${project.id} is marked public but has no DOI.`,
      "Mint or reserve a DOI before publishing the tagged release.",
    ));
  }

  return findings;
}

function verifyVersioning(project, policy) {
  const findings = [];
  const release = project.release || {};
  const history = project.history || {};

  if (!release.version || !/^v\d+\.\d+\.\d+(-[a-z0-9.-]+)?$/.test(release.version)) {
    findings.push(finding(
      "blocker",
      "SEMVER_TAG_INVALID",
      "Release tag is not a valid semantic version",
      `${project.id} release version=${release.version || "missing"}.`,
      "Use a vMAJOR.MINOR.PATCH tag before export or DOI citation.",
    ));
  }

  if (!history.baseCommit || !history.headCommit) {
    findings.push(finding(
      "blocker",
      "VERSION_HISTORY_INCOMPLETE",
      "Version history lacks base or head commit",
      `${project.id} base=${history.baseCommit || "missing"} head=${history.headCommit || "missing"}.`,
      "Record base and head commits so rollback, provenance, and export bundle verification work.",
    ));
  }

  if ((history.unreviewedChanges || 0) > (policy.maxUnreviewedChanges || 0)) {
    findings.push(finding(
      "high",
      "UNREVIEWED_CHANGES_PRESENT",
      "Release contains unreviewed changes",
      `${project.id} has ${history.unreviewedChanges} unreviewed changes.`,
      "Require merge request review before tagging the project repository.",
    ));
  }

  return findings;
}

function verifyForkAndMerge(project) {
  const findings = [];
  const fork = project.fork || {};
  const mergeRequest = project.mergeRequest || {};

  if (fork.isFork && (!fork.parentProjectId || !fork.attribution)) {
    findings.push(finding(
      "high",
      "FORK_ATTRIBUTION_MISSING",
      "Fork provenance lacks attribution",
      `${project.id} is a fork without parent project attribution.`,
      "Store parent project ID and attribution text before allowing publication or export.",
    ));
  }

  if (mergeRequest.required && !mergeRequest.reviewedBy?.length) {
    findings.push(finding(
      "high",
      "MERGE_REQUEST_REVIEW_MISSING",
      "Merge request has no reviewer approval",
      `${project.id} requires MR review but has no reviewers.`,
      "Require at least one reviewer approval before merging research changes into a release branch.",
    ));
  }

  if (mergeRequest.required && mergeRequest.openDiscussionCount > 0) {
    findings.push(finding(
      "medium",
      "MERGE_DISCUSSIONS_UNRESOLVED",
      "Merge request still has unresolved discussions",
      `${project.id} has ${mergeRequest.openDiscussionCount} unresolved discussions.`,
      "Resolve open review discussions before tagging the release.",
    ));
  }

  return findings;
}

function verifyReproducibility(project) {
  const findings = [];
  const reproducibility = project.reproducibility || {};

  if (!reproducibility.pipelinePath) {
    findings.push(finding(
      "high",
      "REPRODUCIBILITY_PIPELINE_MISSING",
      "No reproducibility pipeline is configured",
      `${project.id} has no pipeline path for auto-execution.`,
      "Add a reproducibility pipeline that rebuilds results from raw data and code.",
    ));
  }

  if (reproducibility.lastRunStatus && reproducibility.lastRunStatus !== "passed") {
    findings.push(finding(
      "blocker",
      "REPRODUCIBILITY_RUN_FAILED",
      "Last reproducibility run did not pass",
      `${project.id} last run status=${reproducibility.lastRunStatus}.`,
      "Block citation/export until the sandboxed reproducibility run passes.",
    ));
  }

  if (!reproducibility.environment?.containerImage && !reproducibility.environment?.condaFile) {
    findings.push(finding(
      "medium",
      "RUNTIME_ENVIRONMENT_UNPINNED",
      "Runtime environment is not pinned",
      `${project.id} lacks a container image or conda environment file.`,
      "Pin a container image or conda environment before claiming reproducible results.",
    ));
  }

  return findings;
}

function auditProjectRepository(project, policy = {}) {
  const findings = [
    ...verifyAreaCoverage(project),
    ...verifyHashes(project),
    ...verifyLargeFilePolicy(project, policy),
    ...verifyMetadata(project),
    ...verifyVersioning(project, policy),
    ...verifyForkAndMerge(project),
    ...verifyReproducibility(project),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "block-project-release"
    : high
      ? "manual-repository-review"
      : findings.length
        ? "tag-with-versioning-notices"
        : "ready-for-version-tag";

  const packet = {
    projectId: project.id,
    title: project.metadata?.title || project.title,
    reviewedAt: policy.reviewDate,
    decision,
    riskScore,
    fileCount: allFiles(project).length,
    areasPresent: REQUIRED_AREAS.filter((area) => filesForArea(project, area).length > 0),
    releaseVersion: project.release?.version || null,
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    exportBundleMode: "manifest-preview-only",
    generatedFrom: "synthetic-project-repository-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Repository Integrity Audit",
    "",
    `Project: ${result.title} (${result.projectId})`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `File count: ${result.fileCount}`,
    `Release version: ${result.releaseVersion || "not set"}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Areas Present",
    ...result.areasPresent.map((area) => `- ${area}/`),
    "",
    "## Findings",
  ];

  if (!result.findings.length) {
    lines.push("- No repository integrity issues detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }

  lines.push("", "## Safety", "- Synthetic project repository manifest only; no private data, Git remotes, DOI providers, credentials, or external APIs.");
  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const color = result.decision === "block-project-release"
    ? "#b42318"
    : result.decision === "ready-for-version-tag"
      ? "#067647"
      : "#b54708";
  const severityCounts = ["blocker", "high", "medium", "low"].map((severity) => ({
    severity,
    count: result.findings.filter((item) => item.severity === severity).length,
  }));
  const maxCount = Math.max(...severityCounts.map((item) => item.count), 1);
  const bars = severityCounts.map((item, index) => {
    const x = 130 + index * 180;
    const height = Math.round(210 * item.count / maxCount);
    const fill = item.severity === "blocker" ? "#7a271a" : item.severity === "high" ? "#b42318" : item.severity === "medium" ? "#f79009" : "#667085";
    return `<rect x="${x}" y="${350 - height}" width="92" height="${height}" rx="6" fill="${fill}"/>
  <text x="${x}" y="382" font-family="Arial" font-size="18" fill="#344054">${escapeXml(item.severity)}</text>
  <text x="${x + 34}" y="${335 - height}" font-family="Arial" font-size="20" font-weight="700" fill="#101828">${item.count}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="440" viewBox="0 0 960 440" role="img" aria-label="Repository integrity audit summary">
  <rect width="960" height="440" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="392" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Repository Integrity Audit</text>
  <rect x="36" y="98" width="380" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="446" y="129" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${bars}
  <text x="36" y="408" font-family="Arial" font-size="18" fill="#667085">Synthetic repository manifest only. No remote writes or external API calls.</text>
</svg>
`;
}

module.exports = {
  auditProjectRepository,
  digest,
  hashContent,
  renderMarkdownReport,
  renderSvgSummary,
};
