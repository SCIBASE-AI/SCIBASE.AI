const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 33,
  high: 17,
  medium: 8,
  low: 3,
};

const SUPPORTED_FILE_TYPES = new Set([
  "csv",
  "tsv",
  "xlsx",
  "json",
  "parquet",
  "py",
  "r",
  "jl",
  "ipynb",
  "png",
  "svg",
  "jpg",
  "mp4",
  "onnx",
  "pt",
  "h5",
  "txt",
  "md",
]);

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

function finding(severity, code, title, evidence, action) {
  return { severity, code, title, evidence, action };
}

function fileExtension(path) {
  const match = String(path || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function verifyStorageArtifacts(bundle, policy) {
  const findings = [];
  const maxFileBytes = policy.maxFileBytes || 5 * 1024 * 1024 * 1024;

  (bundle.artifacts || []).forEach((artifact) => {
    const ext = artifact.type || fileExtension(artifact.path);
    if (!SUPPORTED_FILE_TYPES.has(ext)) {
      findings.push(finding(
        "high",
        "UNSUPPORTED_ARTIFACT_TYPE",
        "Artifact file type is not supported by the hosting preview layer",
        `${artifact.path} has type=${ext || "missing"}.`,
        "Add a supported preview/execution handler or reject the upload before publication.",
      ));
    }

    if (!artifact.sha256) {
      findings.push(finding(
        "blocker",
        "ARTIFACT_DIGEST_MISSING",
        "Artifact lacks an integrity digest",
        `${artifact.path} has no sha256 digest.`,
        "Generate an integrity digest before storing, diffing, or executing the artifact.",
      ));
    }

    if ((artifact.sizeBytes || 0) > maxFileBytes) {
      findings.push(finding(
        "high",
        "ARTIFACT_EXCEEDS_STORAGE_LIMIT",
        "Artifact exceeds configured storage limits",
        `${artifact.path} is ${artifact.sizeBytes} bytes, above ${maxFileBytes}.`,
        "Route the artifact through large-object storage with resumable upload and quota approval.",
      ));
    }

    if (artifact.category === "dataset" && !artifact.preview?.schemaInferred) {
      findings.push(finding(
        "medium",
        "DATASET_SCHEMA_PREVIEW_MISSING",
        "Dataset lacks a metadata-aware schema preview",
        `${artifact.path} has no inferred schema preview.`,
        "Infer columns, types, and row counts before showing the dataset as reusable.",
      ));
    }

    if (artifact.category === "code" && !artifact.versioning?.diffEnabled) {
      findings.push(finding(
        "medium",
        "CODE_DIFF_DISABLED",
        "Code artifact lacks diff support",
        `${artifact.path} cannot be diffed across upload versions.`,
        "Enable code-aware diffs for scripts, notebooks, and environment files.",
      ));
    }
  });

  return findings;
}

function verifyMetadata(bundle) {
  const findings = [];
  const metadata = bundle.metadata || {};

  if (!metadata.identifier || !/^(doi:10\.\d{4,9}\/.+|uuid:[a-f0-9-]{36})$/i.test(metadata.identifier)) {
    findings.push(finding(
      "high",
      "PERSISTENT_IDENTIFIER_MISSING",
      "Hosted artifact bundle lacks a persistent identifier",
      `${bundle.id} identifier=${metadata.identifier || "missing"}.`,
      "Attach a DOI or UUID before indexing the bundle as findable.",
    ));
  }

  if (!metadata.license) {
    findings.push(finding(
      "high",
      "REUSE_LICENSE_MISSING",
      "Reusable artifact bundle lacks a license",
      `${bundle.id} has no reuse license.`,
      "Set a data/code license before public sharing or API export.",
    ));
  }

  if (!metadata.datacite || !metadata.jsonLd || !metadata.schemaOrg) {
    findings.push(finding(
      "high",
      "STRUCTURED_METADATA_INCOMPLETE",
      "Structured metadata is incomplete",
      `${bundle.id} datacite=${Boolean(metadata.datacite)} jsonLd=${Boolean(metadata.jsonLd)} schemaOrg=${Boolean(metadata.schemaOrg)}.`,
      "Generate DataCite, JSON-LD, and schema.org metadata before DOI registration or discovery indexing.",
    ));
  }

  if (!metadata.keywords?.length || !metadata.variables?.length) {
    findings.push(finding(
      "medium",
      "FAIR_KEYWORDS_OR_VARIABLES_MISSING",
      "FAIR discovery metadata is thin",
      `${bundle.id} keywords=${metadata.keywords?.length || 0} variables=${metadata.variables?.length || 0}.`,
      "Add scientific keywords, variables, instruments, organisms, or method tags.",
    ));
  }

  return findings;
}

function verifyAccessControls(bundle) {
  const findings = [];
  const access = bundle.access || {};

  if (access.visibility === "public" && bundle.artifacts?.some((artifact) => artifact.containsRestrictedData)) {
    findings.push(finding(
      "blocker",
      "RESTRICTED_DATA_PUBLIC",
      "Public bundle contains restricted data",
      `${bundle.id} is public while at least one artifact is restricted.`,
      "Keep restricted artifacts private or remove them from the public bundle.",
    ));
  }

  if (access.visibility !== "public" && !access.authorizedGroups?.length) {
    findings.push(finding(
      "high",
      "PRIVATE_ACCESS_GROUPS_MISSING",
      "Private bundle has no authorized access groups",
      `${bundle.id} visibility=${access.visibility || "missing"} but no groups are authorized.`,
      "Assign lab, reviewer, or institution groups before making private artifacts available.",
    ));
  }

  if (!access.auditLogging) {
    findings.push(finding(
      "medium",
      "ACCESS_AUDIT_LOGGING_DISABLED",
      "Artifact access audit logging is disabled",
      `${bundle.id} has no access audit log.`,
      "Enable audit logs for downloads, previews, and execution events.",
    ));
  }

  return findings;
}

function verifyExecutionEnvironment(bundle, policy) {
  const findings = [];
  const runtime = bundle.runtime || {};
  const limits = runtime.sandboxLimits || {};

  if (!runtime.containerImage && !runtime.environmentFile) {
    findings.push(finding(
      "high",
      "EXECUTION_ENVIRONMENT_MISSING",
      "Executable artifacts lack a runtime environment",
      `${bundle.id} has no container image or environment file.`,
      "Attach a Docker image, Dockerfile, or environment.yml before enabling execution.",
    ));
  }

  if (!runtime.sandboxed) {
    findings.push(finding(
      "blocker",
      "EXECUTION_SANDBOX_DISABLED",
      "Execution sandbox is disabled",
      `${bundle.id} would run code without sandbox enforcement.`,
      "Enable sandbox isolation before notebooks, scripts, or model workflows can execute.",
    ));
  }

  if ((limits.cpu || 0) > (policy.maxSandboxCpu || 8) || (limits.memoryGb || 0) > (policy.maxSandboxMemoryGb || 32)) {
    findings.push(finding(
      "medium",
      "SANDBOX_LIMITS_EXCEED_POLICY",
      "Sandbox limits exceed policy",
      `${bundle.id} cpu=${limits.cpu || 0} memoryGb=${limits.memoryGb || 0}.`,
      "Require compute approval or reduce resource limits before scheduled runs.",
    ));
  }

  if (!runtime.reproducibilityTrigger?.path) {
    findings.push(finding(
      "high",
      "REPRODUCIBILITY_TRIGGER_MISSING",
      "No reproducibility trigger is configured",
      `${bundle.id} has no run-analysis or reproduce-results trigger path.`,
      "Add a notebook, script, or workflow trigger that rebuilds results from hosted artifacts.",
    ));
  }

  return findings;
}

function verifyVersioning(bundle) {
  const findings = [];
  const versioning = bundle.versioning || {};

  if (!versioning.currentVersion || !/^v\d+\.\d+\.\d+$/.test(versioning.currentVersion)) {
    findings.push(finding(
      "high",
      "ARTIFACT_VERSION_INVALID",
      "Artifact bundle version is invalid",
      `${bundle.id} currentVersion=${versioning.currentVersion || "missing"}.`,
      "Use a semantic version tag for data/code bundle publication.",
    ));
  }

  if (!versioning.diffManifestPath) {
    findings.push(finding(
      "medium",
      "DIFF_MANIFEST_MISSING",
      "Upload diff manifest is missing",
      `${bundle.id} has no diff manifest for the current upload.`,
      "Generate a file-level diff manifest so reviewers can inspect changes across versions.",
    ));
  }

  if (!versioning.rollbackCheckpoint) {
    findings.push(finding(
      "medium",
      "ROLLBACK_CHECKPOINT_MISSING",
      "Rollback checkpoint is missing",
      `${bundle.id} cannot roll back to a known-good artifact state.`,
      "Create a rollback checkpoint before accepting large artifact changes.",
    ));
  }

  return findings;
}

function evaluateArtifactHosting(bundle, policy = {}) {
  const findings = [
    ...verifyStorageArtifacts(bundle, policy),
    ...verifyMetadata(bundle),
    ...verifyAccessControls(bundle),
    ...verifyExecutionEnvironment(bundle, policy),
    ...verifyVersioning(bundle),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "block-artifact-publication"
    : high
      ? "manual-hosting-review"
      : findings.length
        ? "publish-with-hosting-caveats"
        : "ready-for-hosting";

  const artifactCounts = (bundle.artifacts || []).reduce((counts, artifact) => {
    counts[artifact.category] = (counts[artifact.category] || 0) + 1;
    return counts;
  }, {});

  const packet = {
    bundleId: bundle.id,
    reviewedAt: policy.reviewDate,
    decision,
    riskScore,
    artifactCounts,
    artifactCount: (bundle.artifacts || []).length,
    visibility: bundle.access?.visibility || null,
    runtimeMode: bundle.runtime?.containerImage ? "container" : bundle.runtime?.environmentFile ? "environment-file" : "missing",
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-artifact-bundle-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Artifact Hosting Readiness",
    "",
    `Bundle: ${result.bundleId}`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Artifacts: ${result.artifactCount}`,
    `Visibility: ${result.visibility || "not set"}`,
    `Runtime mode: ${result.runtimeMode}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Artifact Counts",
  ];

  Object.keys(result.artifactCounts)
    .sort()
    .forEach((category) => {
      lines.push(`- ${category}: ${result.artifactCounts[category]}`);
    });

  lines.push("", "## Findings");
  if (!result.findings.length) {
    lines.push("- No artifact hosting readiness issues detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }

  lines.push("", "## Safety", "- Synthetic artifact bundle only; no private files, storage backends, execution sandboxes, credentials, or external APIs.");
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
  const color = result.decision === "block-artifact-publication"
    ? "#b42318"
    : result.decision === "ready-for-hosting"
      ? "#067647"
      : "#b54708";
  const categories = Object.keys(result.artifactCounts).sort();
  const maxCount = Math.max(...categories.map((category) => result.artifactCounts[category]), 1);
  const rows = categories.map((category, index) => {
    const y = 198 + index * 44;
    const width = Math.round(430 * result.artifactCounts[category] / maxCount);
    return `<text x="36" y="${y}" font-family="Arial" font-size="17" fill="#344054">${escapeXml(category)}</text>
  <rect x="190" y="${y - 20}" width="430" height="24" rx="4" fill="#eaecf0"/>
  <rect x="190" y="${y - 20}" width="${width}" height="24" rx="4" fill="#12b76a"/>
  <text x="642" y="${y}" font-family="Arial" font-size="17" fill="#344054">${result.artifactCounts[category]}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="450" viewBox="0 0 960 450" role="img" aria-label="Artifact hosting readiness summary">
  <rect width="960" height="450" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="402" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Artifact Hosting Readiness</text>
  <rect x="36" y="98" width="410" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="476" y="129" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${rows}
  <text x="36" y="416" font-family="Arial" font-size="18" fill="#667085">Synthetic artifact bundle only. No storage or execution service calls.</text>
</svg>
`;
}

module.exports = {
  digest,
  evaluateArtifactHosting,
  fileExtension,
  renderMarkdownReport,
  renderSvgSummary,
};
