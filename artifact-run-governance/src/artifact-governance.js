import crypto from "node:crypto";

const TYPE_RULES = [
  { kind: "dataset", extensions: [".csv", ".tsv", ".xlsx", ".json", ".parquet"] },
  { kind: "notebook", extensions: [".ipynb"] },
  { kind: "code", extensions: [".py", ".r", ".jl", ".js", ".ts"] },
  { kind: "environment", names: ["dockerfile", "environment.yml", "requirements.txt", "conda-lock.yml"] },
  { kind: "model", extensions: [".pt", ".pth", ".onnx", ".h5"] },
  { kind: "archive", extensions: [".zip", ".tar", ".gz"] },
];

const QUARANTINE_SENSITIVITY = new Set(["raw-human-derived", "contains-direct-identifiers"]);
const LARGE_FILE_BYTES = 100_000_000;

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function stableStringify(value) {
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

export function evidenceHash(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16)}`;
}

export function classifyArtifact(artifact) {
  const lowerName = artifact.name.toLowerCase();
  const extensionRule = TYPE_RULES.find((rule) => rule.extensions?.some((extension) => lowerName.endsWith(extension)));
  const nameRule = TYPE_RULES.find((rule) => rule.names?.includes(lowerName));
  const kind = nameRule?.kind ?? extensionRule?.kind ?? "supplementary";

  return {
    artifactId: artifact.id,
    path: artifact.path,
    kind,
    largeFile: artifact.sizeBytes >= LARGE_FILE_BYTES,
    preview:
      kind === "dataset"
        ? "tabular-preview"
        : kind === "notebook"
          ? "notebook-render"
          : kind === "model"
            ? "model-card-preview"
            : kind === "environment"
              ? "environment-summary"
              : "metadata-preview",
    evidenceHash: evidenceHash({ path: artifact.path, kind, sizeBytes: artifact.sizeBytes, mimeType: artifact.mimeType }),
  };
}

export function buildStorageManifest(workspace) {
  const artifacts = workspace.artifacts.map((artifact) => {
    const classification = classifyArtifact(artifact);
    return {
      id: artifact.id,
      path: artifact.path,
      kind: classification.kind,
      contentHash: artifact.contentHash,
      previousHash: artifact.previousHash,
      sizeBytes: artifact.sizeBytes,
      largeFile: classification.largeFile,
      preview: classification.preview,
      accessLevel: artifact.accessLevel,
      sensitivity: artifact.sensitivity,
      license: artifact.license,
    };
  });

  return {
    workspaceId: workspace.id,
    projectId: workspace.project.id,
    artifactCount: artifacts.length,
    largeFileCount: artifacts.filter((artifact) => artifact.largeFile).length,
    artifacts,
    manifestHash: evidenceHash(artifacts),
  };
}

export function evaluateAccessGates(workspace) {
  return workspace.artifacts.map((artifact) => {
    const blockers = [];
    const warnings = [];

    if (QUARANTINE_SENSITIVITY.has(artifact.sensitivity)) {
      blockers.push("sensitive-raw-artifact-quarantine");
    }
    if (artifact.license === "restricted" && artifact.accessLevel !== "private") {
      blockers.push("restricted-license-public-access");
    }
    if (artifact.accessLevel === "public" && workspace.project.accessPolicy === "public-after-embargo") {
      warnings.push("public-access-before-embargo-review");
    }
    if (artifact.sensitivity.includes("human") && !["private", "registered"].includes(artifact.accessLevel) && artifact.sensitivity !== "deidentified-human-derived") {
      blockers.push("human-derived-artifact-needs-controlled-access");
    }
    if (classifyArtifact(artifact).kind === "model" && !artifact.metadata.hasModelCard) {
      warnings.push("model-card-missing");
    }

    return {
      artifactId: artifact.id,
      path: artifact.path,
      decision: blockers.length ? "quarantine" : warnings.length ? "needs-review" : "release-ready",
      blockers,
      warnings,
      evidenceHash: evidenceHash({ artifactId: artifact.id, blockers, warnings }),
    };
  });
}

export function summarizeVersionDiffs(workspace) {
  return workspace.artifacts
    .filter((artifact) => artifact.versionDiff)
    .map((artifact) => {
      const diff = artifact.versionDiff;
      const impactScore = Object.entries(diff).reduce((total, [key, value]) => {
        if (Array.isArray(value)) return total + value.length * 8;
        if (key.toLowerCase().includes("column")) return total + value * 8;
        if (key.toLowerCase().includes("row")) return total + value * 4;
        return total + value * 3;
      }, 0);

      return {
        artifactId: artifact.id,
        path: artifact.path,
        previousHash: artifact.previousHash,
        contentHash: artifact.contentHash,
        diff,
        impact: impactScore >= 20 ? "high" : impactScore >= 8 ? "medium" : "low",
        impactScore,
        evidenceHash: evidenceHash({ id: artifact.id, diff }),
      };
    });
}

export function evaluateEnvironmentReadiness(workspace) {
  const dockerfile = workspace.artifacts.find((artifact) => artifact.name.toLowerCase() === "dockerfile");
  const environment = workspace.artifacts.find((artifact) => artifact.name.toLowerCase() === "environment.yml");
  const blockers = [];
  const warnings = [];

  if (!dockerfile && !environment) {
    blockers.push("missing-executable-environment");
  }
  if (dockerfile && !dockerfile.metadata.pinsDependencies) {
    warnings.push("dockerfile-dependencies-not-pinned");
  }
  if (environment && !environment.metadata.pinsDependencies) {
    warnings.push("environment-dependencies-not-pinned");
  }

  return {
    workspaceId: workspace.id,
    status: blockers.length ? "blocked" : warnings.length ? "needs-hardening" : "ready",
    environmentArtifacts: [dockerfile?.id, environment?.id].filter(Boolean),
    blockers,
    warnings,
    evidenceHash: evidenceHash({ dockerfile: dockerfile?.contentHash, environment: environment?.contentHash, blockers, warnings }),
  };
}

export function evaluateComputeTriggers(workspace) {
  const accessGates = evaluateAccessGates(workspace);
  const accessById = new Map(accessGates.map((gate) => [gate.artifactId, gate]));
  const environment = evaluateEnvironmentReadiness(workspace);

  return workspace.computeTriggers.map((trigger) => {
    const missingArtifacts = trigger.requiresArtifacts.filter((artifactId) => !workspace.artifacts.some((artifact) => artifact.id === artifactId));
    const quarantinedArtifacts = trigger.requiresArtifacts.filter((artifactId) => accessById.get(artifactId)?.decision === "quarantine");
    const blockers = [];
    const warnings = [];

    if (missingArtifacts.length) blockers.push("missing-required-artifacts");
    if (quarantinedArtifacts.length) blockers.push("requires-quarantined-artifacts");
    if (environment.status === "blocked") blockers.push("environment-blocked");
    if (environment.status === "needs-hardening") warnings.push("environment-needs-hardening");
    if (trigger.schedule !== "manual" && trigger.sandboxProfile !== "no-network") warnings.push("scheduled-run-network-review");
    if (trigger.maxRuntimeMinutes > 60) warnings.push("long-runtime-budget-review");

    return {
      triggerId: trigger.id,
      label: trigger.label,
      schedule: trigger.schedule,
      decision: blockers.length ? "blocked" : warnings.length ? "needs-review" : "runnable",
      missingArtifacts,
      quarantinedArtifacts,
      blockers,
      warnings,
      evidenceHash: evidenceHash({ trigger, missingArtifacts, quarantinedArtifacts, blockers, warnings }),
    };
  });
}

export function buildExportDecisions(workspace) {
  const gates = evaluateAccessGates(workspace);
  const gateById = new Map(gates.map((gate) => [gate.artifactId, gate]));

  return workspace.exportTargets.map((target) => {
    const included = [];
    const excluded = [];

    for (const artifact of workspace.artifacts) {
      const gate = gateById.get(artifact.id);
      if (gate.decision === "quarantine" || !target.allowedSensitivity.includes(artifact.sensitivity)) {
        excluded.push({ artifactId: artifact.id, reason: gate.decision === "quarantine" ? "quarantined" : "sensitivity-not-allowed" });
      } else {
        included.push(artifact.id);
      }
    }

    return {
      targetId: target.id,
      label: target.label,
      included,
      excluded,
      decision: excluded.some((item) => item.reason === "quarantined") ? "redacted-export" : "ready",
      exportHash: evidenceHash({ target, included, excluded }),
    };
  });
}

export function buildRetentionPolicy(workspace) {
  return workspace.artifacts.map((artifact) => {
    const classification = classifyArtifact(artifact);
    const retentionDays = artifact.sensitivity === "raw-human-derived" ? 2555 : classification.kind === "environment" ? 3650 : 1825;
    const storageTier = classification.largeFile ? "large-object-store" : "versioned-object-store";

    return {
      artifactId: artifact.id,
      path: artifact.path,
      retentionDays,
      storageTier,
      reason: artifact.sensitivity === "raw-human-derived" ? "controlled-raw-data-retention" : `${classification.kind}-retention`,
    };
  });
}

export function buildGovernancePacket(workspace) {
  const manifest = buildStorageManifest(workspace);
  const accessGates = evaluateAccessGates(workspace);
  const versionDiffs = summarizeVersionDiffs(workspace);
  const environment = evaluateEnvironmentReadiness(workspace);
  const computeTriggers = evaluateComputeTriggers(workspace);
  const exportDecisions = buildExportDecisions(workspace);
  const retention = buildRetentionPolicy(workspace);

  return {
    packetVersion: "artifact-run-governance/v0.1",
    workspaceId: workspace.id,
    projectId: workspace.project.id,
    generatedAt: workspace.generatedAt,
    manifest,
    accessGates,
    versionDiffs,
    environment,
    computeTriggers,
    exportDecisions,
    retention,
    auditHash: evidenceHash({ manifest, accessGates, versionDiffs, environment, computeTriggers, exportDecisions, retention }),
  };
}
