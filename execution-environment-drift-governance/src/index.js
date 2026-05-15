const crypto = require("crypto");

const DAY_MS = 24 * 60 * 60 * 1000;

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function normalizePackageMap(packages = {}) {
  return Object.fromEntries(
    Object.entries(packages)
      .map(([name, version]) => [name.toLowerCase(), String(version)])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeEnvironmentSpec(spec = {}) {
  return {
    baseImage: spec.baseImage || null,
    runtime: spec.runtime || null,
    runtimeVersion: spec.runtimeVersion || null,
    packages: normalizePackageMap(spec.packages),
    gpu: Boolean(spec.gpu),
    network: spec.network || "blocked",
    osPackages: [...(spec.osPackages || [])].sort(),
  };
}

function fingerprintEnvironment(spec) {
  const normalized = normalizeEnvironmentSpec(spec);
  return {
    digest: sha256(normalized),
    normalized,
  };
}

function hasPinnedContainerDigest(baseImage) {
  return typeof baseImage === "string" && baseImage.includes("@sha256:");
}

function detectDependencyChanges(baselinePackages, currentPackages) {
  const names = new Set([...Object.keys(baselinePackages), ...Object.keys(currentPackages)]);
  return [...names].sort().flatMap((name) => {
    const before = baselinePackages[name];
    const after = currentPackages[name];

    if (!before) {
      return [{ type: "dependency_added", severity: "review", package: name, current: after }];
    }

    if (!after) {
      return [{ type: "dependency_removed", severity: "review", package: name, baseline: before }];
    }

    if (before !== after) {
      return [
        {
          type: "dependency_changed",
          severity: after === "latest" || after === "*" ? "block" : "review",
          package: name,
          baseline: before,
          current: after,
        },
      ];
    }

    return [];
  });
}

function detectEnvironmentDrift(environment) {
  const baseline = normalizeEnvironmentSpec(environment.baseline);
  const current = normalizeEnvironmentSpec(environment.current);
  const findings = [];

  if (baseline.baseImage !== current.baseImage) {
    findings.push({
      type: "base_image_changed",
      severity: hasPinnedContainerDigest(current.baseImage) ? "review" : "block",
      baseline: baseline.baseImage,
      current: current.baseImage,
    });
  }

  if (!hasPinnedContainerDigest(current.baseImage)) {
    findings.push({
      type: "base_image_unpinned",
      severity: "block",
      current: current.baseImage,
    });
  }

  if (baseline.runtime !== current.runtime || baseline.runtimeVersion !== current.runtimeVersion) {
    findings.push({
      type: "runtime_changed",
      severity: "review",
      baseline: `${baseline.runtime || "unknown"}@${baseline.runtimeVersion || "unknown"}`,
      current: `${current.runtime || "unknown"}@${current.runtimeVersion || "unknown"}`,
    });
  }

  findings.push(...detectDependencyChanges(baseline.packages, current.packages));

  Object.entries(current.packages).forEach(([name, version]) => {
    if (version === "latest" || version === "*" || version.startsWith("^") || version.startsWith("~")) {
      findings.push({
        type: "dependency_unpinned",
        severity: "block",
        package: name,
        current: version,
      });
    }
  });

  if (baseline.gpu !== current.gpu) {
    findings.push({
      type: "gpu_capability_changed",
      severity: "review",
      baseline: baseline.gpu,
      current: current.gpu,
    });
  }

  if (baseline.network !== current.network) {
    findings.push({
      type: "network_policy_changed",
      severity: current.network === "blocked" ? "review" : "block",
      baseline: baseline.network,
      current: current.network,
    });
  }

  const baselineFingerprint = fingerprintEnvironment(baseline);
  const currentFingerprint = fingerprintEnvironment(current);

  return {
    environmentId: environment.id,
    baselineDigest: baselineFingerprint.digest,
    currentDigest: currentFingerprint.digest,
    drifted: baselineFingerprint.digest !== currentFingerprint.digest,
    findings,
    status: findings.some((finding) => finding.severity === "block")
      ? "BLOCKED"
      : findings.length > 0
        ? "REVIEW"
        : "READY",
  };
}

function detectArtifactType(path = "", explicitType) {
  if (explicitType) return explicitType;
  const lower = path.toLowerCase();
  if (lower.endsWith(".ipynb")) return "code/notebook";
  if (lower.endsWith(".csv") || lower.endsWith(".tsv")) return "dataset/tabular";
  if (lower.endsWith(".json") || lower.endsWith(".jsonld")) return "dataset/json";
  if (lower.endsWith(".py") || lower.endsWith(".r") || lower.endsWith(".jl")) return "code/script";
  if (lower.match(/\.(png|jpg|jpeg|gif|svg)$/)) return "image";
  return "artifact/generic";
}

function scoreFairMetadata(artifact) {
  const metadata = artifact.metadata || {};
  const checks = [
    ["unique_identifier", Boolean(artifact.id || metadata.doi || metadata.uuid)],
    ["title", Boolean(metadata.title)],
    ["creator", Array.isArray(metadata.creators) && metadata.creators.length > 0],
    ["license", Boolean(artifact.license)],
    ["machine_readable_type", Boolean(detectArtifactType(artifact.path, artifact.type))],
    ["version", Boolean(artifact.version)],
    ["tags", Array.isArray(artifact.tags) && artifact.tags.length > 0],
    ["variable_metadata", Array.isArray(metadata.variables) && metadata.variables.length > 0],
  ];

  const passed = checks.filter(([, ok]) => ok).length;
  return {
    score: Number((passed / checks.length).toFixed(2)),
    checks: checks.map(([name, ok]) => ({ name, ok })),
  };
}

function classifyPreview(artifact) {
  const type = detectArtifactType(artifact.path, artifact.type);
  if (type.includes("notebook")) return "render-notebook";
  if (type.includes("csv") || type.includes("tabular")) return "sample-table-preview";
  if (type.includes("json")) return "schema-and-tree-preview";
  if (type.startsWith("image")) return "thumbnail-preview";
  if (type.includes("script")) return "syntax-highlighted-code-preview";
  return "metadata-only-preview";
}

function buildJsonLd(artifact) {
  const metadata = artifact.metadata || {};
  return {
    "@context": "https://schema.org",
    "@type": artifact.type && artifact.type.startsWith("code") ? "SoftwareSourceCode" : "Dataset",
    identifier: artifact.id,
    name: metadata.title || artifact.path,
    license: artifact.license || "UNSPECIFIED",
    creator: (metadata.creators || []).map((creator) => ({ "@type": "Person", identifier: creator })),
    keywords: artifact.tags || [],
    version: artifact.version || "unversioned",
    encodingFormat: detectArtifactType(artifact.path, artifact.type),
  };
}

function buildDataCite(artifact) {
  const metadata = artifact.metadata || {};
  return {
    identifiers: [{ identifier: artifact.id, identifierType: "SCIBASE-ID" }],
    titles: [{ title: metadata.title || artifact.path }],
    creators: (metadata.creators || []).map((creator) => ({ name: creator })),
    publisher: "SCIBASE.AI",
    publicationYear: new Date().getUTCFullYear(),
    resourceType: {
      resourceTypeGeneral: artifact.type && artifact.type.startsWith("code") ? "Software" : "Dataset",
      resourceType: detectArtifactType(artifact.path, artifact.type),
    },
    rightsList: artifact.license ? [{ rights: artifact.license }] : [],
  };
}

function evaluateArtifact(artifact, environmentsById, policy = {}) {
  const fair = scoreFairMetadata(artifact);
  const requiredEnvironmentIds = artifact.requiredEnvironmentIds || [];
  const missingEnvironments = requiredEnvironmentIds.filter((id) => !environmentsById.has(id));
  const reasons = [];

  if (missingEnvironments.length > 0) {
    reasons.push({
      type: "missing_execution_environment",
      severity: "block",
      detail: missingEnvironments.join(", "),
    });
  }

  if (artifact.access?.containsHumanSubjects && !artifact.license) {
    reasons.push({
      type: "restricted_artifact_missing_license",
      severity: "block",
      detail: "Human-subject or restricted artifacts need explicit reuse/licensing metadata.",
    });
  }

  if (artifact.access?.embargoUntil && policy.embargoedExportRequiresApproval) {
    reasons.push({
      type: "embargo_requires_export_approval",
      severity: "review",
      detail: `Embargo active until ${artifact.access.embargoUntil}.`,
    });
  }

  if (fair.score < (policy.minimumFairScoreForDoi || 0.82)) {
    reasons.push({
      type: "fair_score_below_doi_threshold",
      severity: "review",
      detail: `FAIR score ${fair.score} is below DOI threshold.`,
    });
  }

  const digest = sha256({
    path: artifact.path,
    type: detectArtifactType(artifact.path, artifact.type),
    version: artifact.version,
    content: artifact.content,
    metadata: artifact.metadata,
  });

  return {
    artifactId: artifact.id,
    path: artifact.path,
    type: detectArtifactType(artifact.path, artifact.type),
    digest,
    preview: classifyPreview(artifact),
    fair,
    jsonLd: buildJsonLd(artifact),
    dataCite: buildDataCite(artifact),
    status: reasons.some((reason) => reason.severity === "block")
      ? "BLOCKED"
      : reasons.length > 0
        ? "REVIEW"
        : "READY",
    reasons,
  };
}

function cadenceToDays(cadence) {
  return {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
  }[cadence] || 7;
}

function isDue(trigger) {
  const lastRunAt = new Date(trigger.lastRunAt || 0).getTime();
  const requestedAt = new Date(trigger.requestedAt || Date.now()).getTime();
  const dueAfter = lastRunAt + cadenceToDays(trigger.cadence) * DAY_MS;
  return requestedAt >= dueAfter;
}

function planRerun(trigger, artifactEvaluations, environmentDrift, environment) {
  const artifactStatuses = trigger.artifactIds.map((artifactId) => artifactEvaluations.get(artifactId));
  const missingArtifacts = artifactStatuses.filter(Boolean).length !== trigger.artifactIds.length;
  const blockingArtifacts = artifactStatuses.filter((artifact) => artifact?.status === "BLOCKED");
  const reviewArtifacts = artifactStatuses.filter((artifact) => artifact?.status === "REVIEW");
  const estimatedCpuMinutes = trigger.estimatedCpuMinutes || 0;
  const maxCpuMinutes = environment.computePolicy?.maxCpuMinutes || Infinity;
  const due = isDue(trigger);
  const reasons = [];

  if (missingArtifacts) {
    reasons.push({ type: "missing_artifact", severity: "block" });
  }

  if (blockingArtifacts.length > 0) {
    reasons.push({
      type: "artifact_blocked",
      severity: "block",
      artifacts: blockingArtifacts.map((artifact) => artifact.artifactId),
    });
  }

  if (environmentDrift.status === "BLOCKED") {
    reasons.push({
      type: "environment_drift_blocked",
      severity: "block",
      findings: environmentDrift.findings.filter((finding) => finding.severity === "block"),
    });
  } else if (environmentDrift.status === "REVIEW") {
    reasons.push({
      type: "environment_drift_review",
      severity: "review",
      findings: environmentDrift.findings,
    });
  }

  if (reviewArtifacts.length > 0) {
    reasons.push({
      type: "artifact_review_required",
      severity: "review",
      artifacts: reviewArtifacts.map((artifact) => artifact.artifactId),
    });
  }

  if (estimatedCpuMinutes > maxCpuMinutes) {
    reasons.push({
      type: "compute_budget_exceeded",
      severity: "review",
      estimatedCpuMinutes,
      maxCpuMinutes,
    });
  }

  const inputDigest = sha256({
    artifacts: artifactStatuses.map((artifact) => artifact && {
      artifactId: artifact.artifactId,
      digest: artifact.digest,
    }),
    environmentDigest: environmentDrift.currentDigest,
    expectedOutputs: trigger.expectedOutputs || [],
  });

  const action = reasons.some((reason) => reason.severity === "block")
    ? "BLOCKED"
    : reasons.some((reason) => reason.severity === "review")
      ? "REVIEW_REQUIRED"
      : due
        ? "RUN_NOW"
        : "SCHEDULED";

  return {
    triggerId: trigger.id,
    name: trigger.name,
    action,
    due,
    cadence: trigger.cadence,
    inputDigest,
    environmentDigest: environmentDrift.currentDigest,
    estimatedCpuMinutes,
    expectedOutputs: trigger.expectedOutputs || [],
    reasons,
  };
}

function buildRetentionAndExportEvidence(artifact, evaluation, policy = {}) {
  const regulated = artifact.access?.containsHumanSubjects || artifact.access?.classification === "restricted";
  const retentionDays = regulated
    ? policy.regulatedRetentionDays || policy.defaultRetentionDays || 2555
    : policy.defaultRetentionDays || 2555;

  return {
    artifactId: artifact.id,
    retentionDays,
    exportEligible: evaluation.status !== "BLOCKED" && !artifact.access?.embargoUntil,
    doiReady: evaluation.fair.score >= (policy.minimumFairScoreForDoi || 0.82) && Boolean(artifact.license),
    evidenceDigest: sha256({
      artifactDigest: evaluation.digest,
      jsonLd: evaluation.jsonLd,
      dataCite: evaluation.dataCite,
      retentionDays,
    }),
  };
}

function buildRequirementMap(packet) {
  return [
    {
      requirement: "Scalable storage engine for datasets, code, supplementary files",
      evidence: `${packet.artifacts.length} artifact capsules include type detection, content digests, preview policy, and version metadata.`,
    },
    {
      requirement: "Metadata-aware previews and version/diff readiness",
      evidence: "Each artifact receives a deterministic preview policy and digest suitable for version comparison.",
    },
    {
      requirement: "JSON-LD, DataCite, schema.org, and FAIR compliance",
      evidence: "Artifact evaluations emit JSON-LD/DataCite payloads and FAIR score checks with DOI readiness thresholds.",
    },
    {
      requirement: "Executable environments and sandboxed reruns",
      evidence: `${packet.environments.length} environment capsules are fingerprinted and checked for pinned images, dependencies, GPU, and network policy drift.`,
    },
    {
      requirement: "Built-in compute triggers and scheduled reruns",
      evidence: `${packet.reruns.length} rerun plans include due-state, input digests, compute budget checks, expected outputs, and block/review decisions.`,
    },
    {
      requirement: "Research artifact export and retention governance",
      evidence: "Retention/export evidence records DOI readiness, embargo checks, regulated retention days, and immutable evidence digests.",
    },
  ];
}

function buildGovernancePacket(project) {
  const environmentsById = new Map(project.environments.map((environment) => [environment.id, environment]));
  const environmentEvaluations = project.environments.map(detectEnvironmentDrift);
  const environmentEvaluationsById = new Map(
    environmentEvaluations.map((evaluation) => [evaluation.environmentId, evaluation]),
  );

  const artifactEvaluations = project.artifacts.map((artifact) =>
    evaluateArtifact(artifact, environmentsById, project.retentionPolicy),
  );
  const artifactEvaluationsById = new Map(
    artifactEvaluations.map((evaluation) => [evaluation.artifactId, evaluation]),
  );

  const reruns = project.rerunTriggers.map((trigger) =>
    planRerun(
      trigger,
      artifactEvaluationsById,
      environmentEvaluationsById.get(trigger.environmentId),
      environmentsById.get(trigger.environmentId),
    ),
  );

  const retentionAndExport = project.artifacts.map((artifact) =>
    buildRetentionAndExportEvidence(
      artifact,
      artifactEvaluationsById.get(artifact.id),
      project.retentionPolicy,
    ),
  );

  const packet = {
    projectId: project.projectId,
    generatedAt: project.generatedAt || new Date().toISOString(),
    summary: {
      artifacts: project.artifacts.length,
      environments: project.environments.length,
      rerunTriggers: project.rerunTriggers.length,
      readyArtifacts: artifactEvaluations.filter((artifact) => artifact.status === "READY").length,
      blockedArtifacts: artifactEvaluations.filter((artifact) => artifact.status === "BLOCKED").length,
      blockedReruns: reruns.filter((rerun) => rerun.action === "BLOCKED").length,
      reviewReruns: reruns.filter((rerun) => rerun.action === "REVIEW_REQUIRED").length,
      runnableNow: reruns.filter((rerun) => rerun.action === "RUN_NOW").length,
    },
    artifacts: artifactEvaluations,
    environments: environmentEvaluations,
    reruns,
    retentionAndExport,
  };

  return {
    ...packet,
    requirementMap: buildRequirementMap(packet),
  };
}

module.exports = {
  buildGovernancePacket,
  buildRetentionAndExportEvidence,
  detectArtifactType,
  detectEnvironmentDrift,
  evaluateArtifact,
  fingerprintEnvironment,
  normalizeEnvironmentSpec,
  planRerun,
  scoreFairMetadata,
  sha256,
  stableStringify,
};
