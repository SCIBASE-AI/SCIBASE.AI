"use strict";

const crypto = require("node:crypto");
const path = require("node:path");

const PREVIEWABLE_TYPES = new Set(["dataset", "notebook", "figure", "json", "text"]);
const DATA_EXTENSIONS = new Set([".csv", ".tsv", ".xlsx", ".json", ".parquet"]);
const CODE_EXTENSIONS = new Set([".py", ".r", ".jl", ".ipynb"]);
const FIGURE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".svg", ".tif", ".tiff"]);
const MODEL_EXTENSIONS = new Set([".pt", ".pth", ".onnx", ".h5", ".pkl", ".joblib"]);
const SECRET_PATTERNS = [/\.env$/i, /\.pem$/i, /\.key$/i, /secret/i, /token/i, /credential/i];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => object[field] === undefined || object[field] === null);
  if (missing.length > 0) throw new Error(`${label} is missing required field(s): ${missing.join(", ")}`);
}

function finding(severity, id, title, detail, remediation, targetIds = []) {
  return { severity, id, title, detail, remediation, targetIds };
}

function classifyArtifact(artifact) {
  const ext = path.extname(artifact.path || artifact.name || "").toLowerCase();
  if (DATA_EXTENSIONS.has(ext)) return ext === ".json" ? "json" : "dataset";
  if (CODE_EXTENSIONS.has(ext)) return ext === ".ipynb" ? "notebook" : "code";
  if (FIGURE_EXTENSIONS.has(ext)) return "figure";
  if (MODEL_EXTENSIONS.has(ext)) return "model";
  if ([".yml", ".yaml", ".toml", ".lock", ".dockerfile"].includes(ext) || artifact.path === "Dockerfile") {
    return "environment";
  }
  if ([".md", ".txt"].includes(ext)) return "text";
  return "supplement";
}

function hasSecretSignal(artifact) {
  const target = `${artifact.path || ""} ${artifact.name || ""}`;
  return SECRET_PATTERNS.some((pattern) => pattern.test(target)) || (artifact.scan && artifact.scan.secretsDetected > 0);
}

function sensitivitySet(artifact) {
  return new Set([...(artifact.sensitivity || []), ...(artifact.metadata && artifact.metadata.sensitivity || [])]);
}

function evaluateMetadata(artifact) {
  const findings = [];
  const metadata = artifact.metadata || {};
  const requiredFields = ["title", "creators", "publisher", "publicationYear", "resourceType", "license", "keywords"];

  for (const field of requiredFields) {
    const value = metadata[field];
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0) || value === "") {
      findings.push(finding(
        "warning",
        "metadata-field-missing",
        "Artifact metadata is incomplete",
        `${artifact.id} is missing DataCite-style metadata field: ${field}.`,
        "Add complete title, creators, publisher, publication year, resource type, license, and keywords before export.",
        [artifact.id, field],
      ));
    }
  }

  if (!metadata.doi && !metadata.identifier) {
    findings.push(finding(
      "warning",
      "persistent-identifier-missing",
      "Artifact lacks persistent identifier",
      `${artifact.id} has no DOI or stable identifier.`,
      "Mint or reserve a DOI/UUID before making the artifact externally discoverable.",
      [artifact.id],
    ));
  }

  if (metadata.jsonLd !== true) {
    findings.push(finding(
      "warning",
      "jsonld-export-missing",
      "JSON-LD export is not marked ready",
      `${artifact.id} does not have JSON-LD metadata ready for machine discovery.`,
      "Generate JSON-LD metadata from the artifact manifest.",
      [artifact.id],
    ));
  }

  if (metadata.schemaOrg !== true) {
    findings.push(finding(
      "warning",
      "schema-org-export-missing",
      "schema.org markup is not marked ready",
      `${artifact.id} does not have schema.org discovery metadata ready.`,
      "Generate schema.org Dataset or SoftwareSourceCode markup before public export.",
      [artifact.id],
    ));
  }

  return findings;
}

function evaluateArtifact(artifact, policy) {
  requireFields(artifact, ["id", "path", "hash", "sizeBytes", "access"], "artifact");
  const artifactType = classifyArtifact(artifact);
  const findings = [];
  const sensitivity = sensitivitySet(artifact);

  if (hasSecretSignal(artifact)) {
    findings.push(finding(
      "blocker",
      "secret-signal-detected",
      "Artifact may contain credentials or secrets",
      `${artifact.id} matches a secret filename or scan signal.`,
      "Quarantine the artifact and require credential rotation evidence before any preview or export.",
      [artifact.id],
    ));
  }

  if (sensitivity.has("human-subjects") && !artifact.irbApprovalId) {
    findings.push(finding(
      "blocker",
      "irb-approval-missing",
      "Human-subjects artifact lacks IRB approval",
      `${artifact.id} is marked human-subjects but has no IRB approval reference.`,
      "Attach IRB approval or mark the artifact private and non-runnable.",
      [artifact.id],
    ));
  }

  if ((sensitivity.has("pii") || sensitivity.has("phi")) && artifact.deidentificationEvidence !== "verified") {
    findings.push(finding(
      "blocker",
      "deidentification-not-verified",
      "Sensitive data lacks verified de-identification evidence",
      `${artifact.id} contains PII/PHI indicators without verified de-identification.`,
      "Require de-identification evidence before previews, public links, or compute triggers.",
      [artifact.id],
    ));
  }

  if (artifact.access === "public" && !(artifact.metadata && artifact.metadata.license)) {
    findings.push(finding(
      "blocker",
      "public-license-missing",
      "Public artifact lacks reuse license",
      `${artifact.id} is public but has no license metadata.`,
      "Set a clear reuse license before creating a public persistent link.",
      [artifact.id],
    ));
  }

  if (artifact.sizeBytes > policy.maxArtifactBytes) {
    findings.push(finding(
      "warning",
      "artifact-exceeds-storage-policy",
      "Artifact exceeds configured storage policy",
      `${artifact.id} is ${artifact.sizeBytes} bytes, above ${policy.maxArtifactBytes}.`,
      "Route the artifact to large-object storage and require checksum verification.",
      [artifact.id],
    ));
  }

  findings.push(...evaluateMetadata(artifact));

  const decision = findings.some((item) => item.severity === "blocker")
    ? "quarantine"
    : findings.some((item) => item.severity === "warning")
      ? "manual-review"
      : "approved";

  return {
    artifactId: artifact.id,
    path: artifact.path,
    type: artifactType,
    version: artifact.version || "unversioned",
    access: artifact.access,
    decision,
    findings,
  };
}

function buildPreviewDescriptor(artifact, artifactDecision, policy) {
  const type = classifyArtifact(artifact);
  if (artifactDecision.decision === "quarantine") {
    return {
      artifactId: artifact.id,
      mode: "disabled",
      reason: "quarantined-artifact",
    };
  }

  if (!PREVIEWABLE_TYPES.has(type)) {
    return {
      artifactId: artifact.id,
      mode: "metadata-only",
      reason: `no-inline-preview-for-${type}`,
    };
  }

  if (artifact.sizeBytes > policy.maxInlinePreviewBytes) {
    return {
      artifactId: artifact.id,
      mode: "metadata-only",
      reason: "artifact-too-large-for-inline-preview",
    };
  }

  return {
    artifactId: artifact.id,
    mode: type === "dataset" ? "tabular-sample" : `${type}-preview`,
    redacted: sensitivitySet(artifact).size > 0,
    reason: "preview-safe",
  };
}

function evaluateEnvironment(environment) {
  requireFields(environment, ["id", "kind", "name"], "environment");
  const findings = [];

  if (environment.kind === "docker" && !environment.imageDigest) {
    findings.push(finding(
      "blocker",
      "docker-digest-missing",
      "Docker environment is not pinned by digest",
      `${environment.id} uses ${environment.image || "an image"} without an immutable digest.`,
      "Pin the Docker image by digest before allowing reproducible reruns.",
      [environment.id],
    ));
  }

  if (environment.kind === "conda" && !environment.lockfileHash) {
    findings.push(finding(
      "blocker",
      "conda-lock-missing",
      "Conda environment lacks lockfile hash",
      `${environment.id} has no lockfile hash.`,
      "Generate and store a lockfile hash before scheduled reruns.",
      [environment.id],
    ));
  }

  if (environment.kind === "notebook" && !environment.kernel) {
    findings.push(finding(
      "warning",
      "notebook-kernel-missing",
      "Notebook environment does not declare a kernel",
      `${environment.id} has no kernel metadata.`,
      "Record notebook kernel and runtime package lock before reviewer execution.",
      [environment.id],
    ));
  }

  if (environment.networkAccess === true && environment.networkJustification !== "approved") {
    findings.push(finding(
      "warning",
      "network-access-unapproved",
      "Executable environment requests unapproved network access",
      `${environment.id} enables network access without approval.`,
      "Disable network access or attach approval and egress rules.",
      [environment.id],
    ));
  }

  return {
    environmentId: environment.id,
    decision: findings.some((item) => item.severity === "blocker")
      ? "blocked"
      : findings.length > 0 ? "manual-review" : "ready",
    findings,
  };
}

function evaluateComputeTrigger(trigger, context, policy) {
  requireFields(trigger, ["id", "environmentId", "inputArtifactIds", "command"], "compute trigger");
  const findings = [];
  const environmentDecision = context.environmentDecisions.get(trigger.environmentId);

  if (!environmentDecision) {
    findings.push(finding(
      "blocker",
      "environment-not-found",
      "Compute trigger references missing environment",
      `${trigger.id} references ${trigger.environmentId}, which is not defined.`,
      "Attach a valid executable environment before enabling reruns.",
      [trigger.id, trigger.environmentId],
    ));
  } else if (environmentDecision.decision === "blocked") {
    findings.push(finding(
      "blocker",
      "environment-blocked",
      "Compute trigger uses blocked environment",
      `${trigger.id} uses ${trigger.environmentId}, which is not reproducible yet.`,
      "Resolve environment pinning problems before enabling the trigger.",
      [trigger.id, trigger.environmentId],
    ));
  } else if (environmentDecision.decision === "manual-review") {
    findings.push(finding(
      "warning",
      "environment-needs-review",
      "Compute trigger environment needs manual review",
      `${trigger.id} uses ${trigger.environmentId}, which has non-blocking review findings.`,
      "Review environment warnings before scheduled reruns.",
      [trigger.id, trigger.environmentId],
    ));
  }

  for (const artifactId of trigger.inputArtifactIds) {
    const artifactDecision = context.artifactDecisions.get(artifactId);
    if (!artifactDecision) {
      findings.push(finding(
        "blocker",
        "input-artifact-not-found",
        "Compute trigger references missing input artifact",
        `${trigger.id} references missing input artifact ${artifactId}.`,
        "Attach all input artifacts before enabling the trigger.",
        [trigger.id, artifactId],
      ));
    } else if (artifactDecision.decision === "quarantine") {
      findings.push(finding(
        "blocker",
        "input-artifact-quarantined",
        "Compute trigger uses quarantined input",
        `${trigger.id} depends on quarantined artifact ${artifactId}.`,
        "Resolve quarantine findings before execution.",
        [trigger.id, artifactId],
      ));
    }
  }

  if (trigger.schedule && trigger.schedule.enabled && trigger.schedule.approved !== true) {
    findings.push(finding(
      "blocker",
      "scheduled-rerun-unapproved",
      "Scheduled rerun lacks approval",
      `${trigger.id} has an enabled schedule without approval.`,
      "Approve scheduled reruns or disable the schedule.",
      [trigger.id],
    ));
  }

  if (trigger.estimatedCostCents > policy.maxRunCostCents) {
    findings.push(finding(
      "warning",
      "compute-cost-review-required",
      "Compute trigger exceeds cost review threshold",
      `${trigger.id} estimates ${trigger.estimatedCostCents} cents, above ${policy.maxRunCostCents}.`,
      "Require budget owner approval before execution.",
      [trigger.id],
    ));
  }

  const decision = findings.some((item) => item.severity === "blocker")
    ? "blocked"
    : findings.length > 0 ? "manual-review" : "ready";

  return {
    triggerId: trigger.id,
    environmentId: trigger.environmentId,
    command: trigger.command,
    decision,
    findings,
  };
}

function calculateFairScore(artifactReports) {
  const total = artifactReports.length * 4;
  if (total === 0) return 0;
  const lost = artifactReports.reduce((score, report) => {
    const ids = new Set(report.findings.map((item) => item.id));
    let penalty = 0;
    if (ids.has("persistent-identifier-missing")) penalty += 1;
    if (ids.has("public-license-missing") || ids.has("metadata-field-missing")) penalty += 1;
    if (ids.has("jsonld-export-missing") || ids.has("schema-org-export-missing")) penalty += 1;
    if (report.decision === "quarantine") penalty += 1;
    return score + Math.min(4, penalty);
  }, 0);
  return Math.round(((total - lost) / total) * 100);
}

function buildRetentionActions(artifactReports) {
  return artifactReports.map((report) => {
    if (report.decision === "quarantine") {
      return { artifactId: report.artifactId, action: "retain-private-quarantine", exportable: false };
    }
    if (report.decision === "manual-review") {
      return { artifactId: report.artifactId, action: "hold-for-metadata-review", exportable: false };
    }
    return { artifactId: report.artifactId, action: "publish-persistent-link", exportable: true };
  });
}

function evaluateHostingGovernance(bundle, options = {}) {
  requireFields(bundle, ["project", "artifacts", "environments", "computeTriggers"], "hosting governance bundle");
  requireFields(bundle.project, ["id", "title"], "project");

  const policy = {
    maxArtifactBytes: 10 * 1024 * 1024 * 1024,
    maxInlinePreviewBytes: 10 * 1024 * 1024,
    maxRunCostCents: 5000,
    ...(bundle.policy || {}),
    ...(options.policy || {}),
  };

  const artifactReports = bundle.artifacts.map((artifact) => evaluateArtifact(artifact, policy));
  const artifactDecisions = new Map(artifactReports.map((report) => [report.artifactId, report]));
  const previewDescriptors = bundle.artifacts.map((artifact) => {
    return buildPreviewDescriptor(artifact, artifactDecisions.get(artifact.id), policy);
  });

  const environmentReports = bundle.environments.map(evaluateEnvironment);
  const environmentDecisions = new Map(environmentReports.map((report) => [report.environmentId, report]));
  const computePlans = bundle.computeTriggers.map((trigger) => {
    return evaluateComputeTrigger(trigger, { artifactDecisions, environmentDecisions }, policy);
  });

  const allFindings = [
    ...artifactReports.flatMap((report) => report.findings),
    ...environmentReports.flatMap((report) => report.findings),
    ...computePlans.flatMap((report) => report.findings),
  ];
  const decision = allFindings.some((item) => item.severity === "blocker")
    ? "hosting-blocked"
    : allFindings.length > 0 ? "manual-review" : "ready-for-publication";
  const retentionActions = buildRetentionActions(artifactReports);
  const fairScore = calculateFairScore(artifactReports);
  const evaluatedAt = options.now || bundle.now || new Date().toISOString();
  const auditDigest = stableHash({
    projectId: bundle.project.id,
    decision,
    fairScore,
    artifactReports,
    environmentReports,
    computePlans,
    retentionActions,
    evaluatedAt,
  });

  return {
    projectId: bundle.project.id,
    title: bundle.project.title,
    evaluatedAt,
    decision,
    fairScore,
    artifactReports,
    previewDescriptors,
    environmentReports,
    computePlans,
    retentionActions,
    auditDigest: `sha256:${auditDigest}`,
  };
}

module.exports = {
  classifyArtifact,
  evaluateHostingGovernance,
  stableHash,
  stableStringify,
};
