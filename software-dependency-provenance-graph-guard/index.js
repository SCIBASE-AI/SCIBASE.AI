"use strict";

const crypto = require("crypto");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RESTRICTIVE_LICENSES = new Set([
  "proprietary",
  "restricted",
  "research-only",
  "no-redistribution",
  "unknown"
]);
const HIGH_RISK_SEVERITIES = new Set(["critical", "high"]);

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${fieldName}: ${value}`);
  }
  return date;
}

function daysBetween(start, end) {
  return Math.floor((parseDate(end, "end") - parseDate(start, "start")) / MS_PER_DAY);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function looksLikeSha256Digest(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/i.test(value);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDependencyKey(dependency) {
  const ecosystem = normalizeText(dependency.ecosystem || "unknown");
  const name = normalizeText(dependency.name || "unnamed");
  return `${ecosystem}:${name}`;
}

function dependencyRefToKey(ref, dependencies) {
  const normalized = normalizeText(ref);
  if (normalized.includes(":")) {
    return normalized;
  }
  const match = dependencies.find((dependency) => normalizeText(dependency.name) === normalized);
  return match ? normalizeDependencyKey(match) : normalized;
}

function addFinding(findings, project, severity, code, message, evidence, remediation) {
  findings.push({
    projectId: project.id,
    projectTitle: project.title,
    severity,
    code,
    message,
    evidence,
    remediation
  });
}

function versionMismatch(left, right) {
  return Boolean(left && right && String(left).trim() !== String(right).trim());
}

function evidenceAgeDays(now, timestamp) {
  if (!timestamp) {
    return null;
  }
  return daysBetween(timestamp, now);
}

function collectPublicRecommendationDependencyKeys(project) {
  const keys = new Set();
  for (const recommendation of project.recommendations || []) {
    if (recommendation.public === false) {
      continue;
    }
    for (const ref of recommendation.dependencies || []) {
      keys.add(dependencyRefToKey(ref, project.dependencies || []));
    }
  }
  return keys;
}

function validateRuntime(project, findings, now, options) {
  const runtime = project.runtime || {};

  if (!runtime.containerDigest || !looksLikeSha256Digest(runtime.containerDigest)) {
    addFinding(
      findings,
      project,
      "critical",
      "unpinned_runtime_container_digest",
      "The project runtime is not pinned to a SHA-256 container digest.",
      { containerDigest: runtime.containerDigest || null },
      "Pin the executed environment to an immutable sha256 container digest before publishing dependency graph edges."
    );
  }

  if (!runtime.lockfileHash || !looksLikeSha256Digest(runtime.lockfileHash)) {
    addFinding(
      findings,
      project,
      "warning",
      "missing_runtime_lockfile_hash",
      "The runtime does not record a verifiable lockfile hash.",
      { lockfileHash: runtime.lockfileHash || null },
      "Record the exact lockfile SHA-256 digest used for the executed notebook or code artifact."
    );
  }

  const runtimeAge = evidenceAgeDays(now, runtime.executedAt);
  if (runtimeAge === null) {
    addFinding(
      findings,
      project,
      "warning",
      "missing_runtime_execution_timestamp",
      "The runtime execution timestamp is missing.",
      { executedAt: null },
      "Attach the last successful execution timestamp before exposing reproducibility-sensitive graph edges."
    );
  } else if (runtimeAge > options.maxRuntimeAgeDays) {
    addFinding(
      findings,
      project,
      "warning",
      "stale_runtime_execution_evidence",
      "The runtime execution evidence is older than the allowed freshness window.",
      { executedAt: runtime.executedAt, ageDays: runtimeAge, maxRuntimeAgeDays: options.maxRuntimeAgeDays },
      "Re-run the notebook or code artifact and refresh the dependency provenance packet."
    );
  }
}

function validateDependency(project, dependency, findings, now, options, publicExposure) {
  const dependencyKey = normalizeDependencyKey(dependency);
  const evidence = dependency.evidence || {};
  const source = dependency.source || {};
  const license = normalizeText(dependency.license || "unknown");

  if (!dependency.name || !dependency.ecosystem) {
    addFinding(
      findings,
      project,
      "warning",
      "incomplete_dependency_identity",
      "A dependency is missing a name or package ecosystem.",
      { dependencyKey, name: dependency.name || null, ecosystem: dependency.ecosystem || null },
      "Normalize dependency identity as ecosystem:name before creating graph edges."
    );
  }

  if (!dependency.declaredIn) {
    addFinding(
      findings,
      project,
      "warning",
      "missing_manifest_reference",
      "The dependency lacks a manifest file reference.",
      { dependencyKey },
      "Point the graph edge to package.json, requirements.txt, pyproject.toml, environment.yml, or an equivalent manifest."
    );
  }

  if (!dependency.lockfileVersion) {
    addFinding(
      findings,
      project,
      "critical",
      "missing_lockfile_version",
      "The dependency has no lockfile-pinned version.",
      { dependencyKey, declaredVersion: dependency.declaredVersion || null },
      "Resolve and commit the lockfile version before using this dependency in public graph recommendations."
    );
  }

  if (versionMismatch(dependency.declaredVersion, dependency.lockfileVersion)) {
    addFinding(
      findings,
      project,
      "critical",
      "manifest_lockfile_version_drift",
      "The declared dependency version does not match the lockfile-pinned version.",
      {
        dependencyKey,
        declaredVersion: dependency.declaredVersion,
        lockfileVersion: dependency.lockfileVersion
      },
      "Reconcile the manifest and lockfile so entity pages do not cite an ambiguous software version."
    );
  }

  if (versionMismatch(dependency.lockfileVersion, dependency.runtimeVersion)) {
    addFinding(
      findings,
      project,
      "critical",
      "runtime_lockfile_version_drift",
      "The executed runtime dependency version differs from the lockfile-pinned version.",
      {
        dependencyKey,
        lockfileVersion: dependency.lockfileVersion || null,
        runtimeVersion: dependency.runtimeVersion || null
      },
      "Rebuild the runtime from the lockfile or refresh the dependency graph edge with the executed version."
    );
  }

  if (!evidence.lockfileHash || !looksLikeSha256Digest(evidence.lockfileHash)) {
    addFinding(
      findings,
      project,
      "warning",
      "missing_dependency_lockfile_hash",
      "The dependency evidence does not include a verifiable lockfile hash.",
      { dependencyKey, lockfileHash: evidence.lockfileHash || null },
      "Attach the lockfile SHA-256 digest that proved this dependency edge."
    );
  } else if (project.runtime && project.runtime.lockfileHash && project.runtime.lockfileHash !== evidence.lockfileHash) {
    addFinding(
      findings,
      project,
      "critical",
      "dependency_runtime_lockfile_hash_mismatch",
      "The dependency evidence was derived from a different lockfile than the executed runtime.",
      {
        dependencyKey,
        dependencyLockfileHash: evidence.lockfileHash,
        runtimeLockfileHash: project.runtime.lockfileHash
      },
      "Regenerate dependency graph edges from the same lockfile digest used by the executed artifact."
    );
  }

  if (!evidence.sbomRef) {
    addFinding(
      findings,
      project,
      "warning",
      "missing_sbom_reference",
      "The dependency graph edge has no SBOM reference.",
      { dependencyKey },
      "Attach a CycloneDX or SPDX SBOM reference so curators can audit dependency provenance."
    );
  }

  const resolvedAge = evidenceAgeDays(now, evidence.resolvedAt);
  if (resolvedAge === null) {
    addFinding(
      findings,
      project,
      "warning",
      "missing_dependency_resolution_timestamp",
      "The dependency resolution timestamp is missing.",
      { dependencyKey },
      "Record when the dependency evidence was resolved before publishing recommendation paths."
    );
  } else if (resolvedAge > options.maxEvidenceAgeDays) {
    addFinding(
      findings,
      project,
      "warning",
      "stale_dependency_resolution_evidence",
      "The dependency resolution evidence is older than the allowed freshness window.",
      { dependencyKey, resolvedAt: evidence.resolvedAt, ageDays: resolvedAge, maxEvidenceAgeDays: options.maxEvidenceAgeDays },
      "Refresh the dependency evidence packet and review deprecation or advisory state."
    );
  }

  if (dependency.packageUrl && !String(dependency.packageUrl).startsWith("pkg:")) {
    addFinding(
      findings,
      project,
      "warning",
      "nonstandard_package_url",
      "The dependency package URL is not in purl format.",
      { dependencyKey, packageUrl: dependency.packageUrl },
      "Represent software entities with package-url identifiers such as pkg:npm/name@version or pkg:pypi/name@version."
    );
  }

  if (publicExposure && normalizeText(source.access) === "private") {
    addFinding(
      findings,
      project,
      "critical",
      "private_dependency_in_public_recommendation",
      "A private dependency is used by a public graph edge or recommendation.",
      { dependencyKey, repository: source.repository || null },
      "Suppress the public recommendation or replace the edge with a public, reviewable software dependency."
    );
  }

  if (publicExposure && RESTRICTIVE_LICENSES.has(license)) {
    addFinding(
      findings,
      project,
      "critical",
      "restricted_license_public_recommendation",
      "A dependency with a restricted or unknown license is exposed through a public recommendation path.",
      { dependencyKey, license: dependency.license || null },
      "Hold the recommendation until licensing metadata allows public graph reuse."
    );
  }

  if (dependency.deprecated) {
    const severity = publicExposure && !dependency.deprecated.replacement ? "critical" : "warning";
    addFinding(
      findings,
      project,
      severity,
      "deprecated_dependency_edge",
      "The dependency is deprecated in the software provenance graph.",
      {
        dependencyKey,
        deprecatedAt: dependency.deprecated.deprecatedAt || null,
        replacement: dependency.deprecated.replacement || null
      },
      dependency.deprecated.replacement
        ? "Route recommendations through the replacement dependency and keep the deprecated edge for historical context only."
        : "Suppress public recommendations until a supported replacement dependency is recorded."
    );
  }

  if (dependency.advisory && HIGH_RISK_SEVERITIES.has(normalizeText(dependency.advisory.severity))) {
    const fixedVersion = dependency.advisory.fixedVersion || null;
    addFinding(
      findings,
      project,
      fixedVersion ? "warning" : "critical",
      "high_risk_dependency_advisory",
      "A high-risk dependency advisory affects the graph edge.",
      {
        dependencyKey,
        advisoryId: dependency.advisory.id || null,
        severity: dependency.advisory.severity,
        fixedVersion
      },
      fixedVersion
        ? "Upgrade to the fixed version before promoting this dependency in recommendations."
        : "Block public graph publication until a patched or replacement dependency is available."
    );
  }
}

function edgeStatusForDependency(dependencyKey, findings) {
  const dependencyFindings = findings.filter((finding) => finding.evidence && finding.evidence.dependencyKey === dependencyKey);
  if (dependencyFindings.some((finding) => finding.severity === "critical")) {
    return "block";
  }
  if (dependencyFindings.some((finding) => finding.severity === "warning")) {
    return "review";
  }
  return "publishable";
}

function validateRecommendations(project, findings, dependencyStatusByKey) {
  for (const recommendation of project.recommendations || []) {
    if (recommendation.public === false) {
      continue;
    }

    const dependencyKeys = (recommendation.dependencies || []).map((ref) => dependencyRefToKey(ref, project.dependencies || []));
    if (dependencyKeys.length === 0) {
      addFinding(
        findings,
        project,
        "warning",
        "public_recommendation_without_dependency_evidence",
        "A public recommendation has no dependency evidence anchors.",
        { recommendationId: recommendation.id },
        "Attach at least one software dependency edge so graph users can inspect the recommendation provenance."
      );
      continue;
    }

    const missing = dependencyKeys.filter((key) => !dependencyStatusByKey.has(key));
    if (missing.length > 0) {
      addFinding(
        findings,
        project,
        "critical",
        "public_recommendation_missing_dependency_nodes",
        "A public recommendation references dependency nodes that are not present in the graph packet.",
        { recommendationId: recommendation.id, missingDependencyKeys: missing },
        "Remove the recommendation or add normalized dependency nodes with reviewable evidence."
      );
    }

    const blocked = dependencyKeys.filter((key) => dependencyStatusByKey.get(key) === "block");
    if (blocked.length > 0) {
      addFinding(
        findings,
        project,
        "critical",
        "public_recommendation_uses_blocked_dependency",
        "A public recommendation path depends on blocked software provenance edges.",
        { recommendationId: recommendation.id, blockedDependencyKeys: blocked },
        "Suppress the recommendation until all dependency edges are publishable."
      );
    }

    const review = dependencyKeys.filter((key) => dependencyStatusByKey.get(key) === "review");
    if (review.length > 0 && blocked.length === 0) {
      addFinding(
        findings,
        project,
        "warning",
        "public_recommendation_needs_dependency_review",
        "A public recommendation path depends on software edges that require curator review.",
        { recommendationId: recommendation.id, reviewDependencyKeys: review },
        "Hold the recommendation until stale, missing, or deprecated dependency evidence is refreshed."
      );
    }
  }
}

function projectStatus(projectFindings) {
  if (projectFindings.some((finding) => finding.severity === "critical")) {
    return "block_publication";
  }
  if (projectFindings.some((finding) => finding.severity === "warning")) {
    return "hold_recommendations";
  }
  return "clear";
}

function evaluateDependencyProvenance(input, userOptions = {}) {
  if (!input || !Array.isArray(input.projects)) {
    throw new Error("Expected input.projects to be an array");
  }

  const options = {
    maxEvidenceAgeDays: 120,
    maxRuntimeAgeDays: 45,
    ...userOptions
  };
  const now = input.generatedAt || new Date().toISOString();
  const findings = [];
  const projects = [];
  const graphEdges = [];
  const recommendations = [];

  for (const project of input.projects) {
    const projectFindingsStart = findings.length;
    const dependencies = project.dependencies || [];
    const publicRecommendationKeys = collectPublicRecommendationDependencyKeys(project);

    validateRuntime(project, findings, now, options);

    for (const dependency of dependencies) {
      const dependencyKey = normalizeDependencyKey(dependency);
      const publicExposure = project.publicGraph === true || publicRecommendationKeys.has(dependencyKey);
      validateDependency(project, dependency, findings, now, options, publicExposure);
    }

    const dependencyStatusByKey = new Map();
    for (const dependency of dependencies) {
      const dependencyKey = normalizeDependencyKey(dependency);
      const edgeStatus = edgeStatusForDependency(dependencyKey, findings);
      dependencyStatusByKey.set(dependencyKey, edgeStatus);
      graphEdges.push({
        edgeId: `${project.id}->${dependencyKey}`,
        projectId: project.id,
        dependencyKey,
        dependencyName: dependency.name,
        ecosystem: dependency.ecosystem,
        version: dependency.lockfileVersion || dependency.runtimeVersion || dependency.declaredVersion || null,
        status: edgeStatus,
        provenanceDigest: digest({
          projectId: project.id,
          dependencyKey,
          declaredIn: dependency.declaredIn || null,
          lockfileVersion: dependency.lockfileVersion || null,
          runtimeVersion: dependency.runtimeVersion || null,
          evidence: dependency.evidence || {}
        })
      });
    }

    validateRecommendations(project, findings, dependencyStatusByKey);

    for (const recommendation of project.recommendations || []) {
      const dependencyKeys = (recommendation.dependencies || []).map((ref) => dependencyRefToKey(ref, dependencies));
      const statuses = dependencyKeys.map((key) => dependencyStatusByKey.get(key) || "missing");
      const status = recommendation.public === false
        ? "private"
        : statuses.includes("block") || statuses.includes("missing")
          ? "suppress"
          : statuses.includes("review")
            ? "hold_for_review"
            : "publishable";
      recommendations.push({
        projectId: project.id,
        recommendationId: recommendation.id,
        public: recommendation.public !== false,
        title: recommendation.title,
        dependencyKeys,
        status
      });
    }

    const projectFindings = findings.slice(projectFindingsStart);
    const status = projectStatus(projectFindings);
    projects.push({
      projectId: project.id,
      title: project.title,
      owner: project.owner || null,
      status,
      dependencyCount: dependencies.length,
      findingCount: projectFindings.length,
      criticalCount: projectFindings.filter((finding) => finding.severity === "critical").length,
      warningCount: projectFindings.filter((finding) => finding.severity === "warning").length
    });
  }

  const summary = {
    generatedAt: now,
    projectCount: projects.length,
    dependencyCount: graphEdges.length,
    recommendationCount: recommendations.length,
    clearCount: projects.filter((project) => project.status === "clear").length,
    holdCount: projects.filter((project) => project.status === "hold_recommendations").length,
    blockCount: projects.filter((project) => project.status === "block_publication").length,
    findingCount: findings.length,
    criticalCount: findings.filter((finding) => finding.severity === "critical").length,
    warningCount: findings.filter((finding) => finding.severity === "warning").length
  };

  const releaseDecision = summary.blockCount > 0
    ? "block_publication"
    : summary.holdCount > 0
      ? "hold_recommendations"
      : "clear";

  const result = {
    releaseDecision,
    summary,
    projects,
    graphEdges,
    recommendations,
    findings
  };
  result.auditDigest = digest(result);
  return result;
}

function renderMarkdownReport(result) {
  const lines = [
    "# Scientific Software Dependency Provenance Graph Review",
    "",
    `Decision: **${result.releaseDecision}**`,
    `Audit digest: \`${result.auditDigest}\``,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Projects | ${result.summary.projectCount} |`,
    `| Dependency edges | ${result.summary.dependencyCount} |`,
    `| Recommendations | ${result.summary.recommendationCount} |`,
    `| Critical findings | ${result.summary.criticalCount} |`,
    `| Warnings | ${result.summary.warningCount} |`,
    "",
    "## Project Decisions",
    "",
    "| Project | Status | Critical | Warnings |",
    "| --- | --- | ---: | ---: |"
  ];

  for (const project of result.projects) {
    lines.push(`| ${project.title} | ${project.status} | ${project.criticalCount} | ${project.warningCount} |`);
  }

  lines.push("", "## Findings", "");
  for (const finding of result.findings) {
    lines.push(`- **${finding.severity} / ${finding.code}** (${finding.projectTitle}): ${finding.message}`);
    lines.push(`  - Remediation: ${finding.remediation}`);
  }

  lines.push("", "## Recommendation Status", "", "| Recommendation | Project | Status |", "| --- | --- | --- |");
  for (const recommendation of result.recommendations) {
    lines.push(`| ${recommendation.title} | ${recommendation.projectId} | ${recommendation.status} |`);
  }

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
  const bars = [
    ["Clear", result.summary.clearCount, "#176b3a"],
    ["Hold", result.summary.holdCount, "#8a5a00"],
    ["Block", result.summary.blockCount, "#9d1c2f"]
  ];
  const max = Math.max(1, ...bars.map(([, count]) => count));
  const rows = bars.map(([label, count, color], index) => {
    const y = 138 + index * 58;
    const width = Math.max(8, Math.round((count / max) * 520));
    return [
      `<text x="64" y="${y + 24}" font-size="18" fill="#334155">${escapeXml(label)}</text>`,
      `<rect x="176" y="${y}" width="${width}" height="32" rx="4" fill="${color}" />`,
      `<text x="${190 + width}" y="${y + 23}" font-size="18" fill="#0f172a">${count}</text>`
    ].join("\n");
  }).join("\n");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="360" viewBox="0 0 900 360">',
    '<rect width="900" height="360" fill="#f8fafc"/>',
    '<rect x="32" y="32" width="836" height="296" rx="8" fill="#ffffff" stroke="#d8dee7"/>',
    '<text x="64" y="82" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#0f172a">Software Dependency Provenance Guard</text>',
    `<text x="64" y="112" font-size="16" font-family="Arial, sans-serif" fill="#475569">Decision: ${escapeXml(result.releaseDecision)} | Digest: ${escapeXml(result.auditDigest.slice(0, 16))}</text>`,
    `<g font-family="Arial, sans-serif">${rows}</g>`,
    `<text x="64" y="314" font-size="15" font-family="Arial, sans-serif" fill="#475569">Dependency edges: ${result.summary.dependencyCount} | Recommendations: ${result.summary.recommendationCount} | Findings: ${result.summary.findingCount}</text>`,
    "</svg>"
  ].join("\n");
}

module.exports = {
  evaluateDependencyProvenance,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  daysBetween,
  normalizeDependencyKey
};
