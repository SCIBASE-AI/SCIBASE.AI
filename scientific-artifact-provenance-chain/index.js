"use strict";

const crypto = require("crypto");
const path = require("path");

const DATA_EXTENSIONS = new Set([".csv", ".tsv", ".xlsx", ".json", ".jsonl", ".parquet", ".feather"]);
const CODE_EXTENSIONS = new Set([".py", ".r", ".jl", ".ipynb", ".sh", ".sql"]);
const FIGURE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".svg", ".pdf", ".tif", ".tiff"]);
const MODEL_EXTENSIONS = new Set([".onnx", ".pkl", ".pt", ".pth", ".joblib", ".h5", ".safetensors"]);
const ENVIRONMENT_EXTENSIONS = new Set([".yml", ".yaml", ".toml", ".lock", ".dockerfile"]);

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

function sha256(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

function normalizeArtifactPath(artifactPath) {
  if (!artifactPath || typeof artifactPath !== "string") {
    throw new Error("artifact path is required");
  }

  const normalized = artifactPath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new Error(`artifact path cannot escape the project: ${artifactPath}`);
  }
  return normalized;
}

function inferArtifactKind(artifactPath, explicitKind) {
  if (explicitKind) {
    return explicitKind;
  }

  const lower = artifactPath.toLowerCase();
  const ext = path.extname(lower);
  const basename = path.basename(lower);

  if (DATA_EXTENSIONS.has(ext)) return "dataset";
  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (FIGURE_EXTENSIONS.has(ext)) return "figure";
  if (MODEL_EXTENSIONS.has(ext)) return "model";
  if (ENVIRONMENT_EXTENSIONS.has(ext) || basename === "dockerfile") return "environment";
  return "supplement";
}

function lineStats(content) {
  const text = String(content);
  const lines = text.length === 0 ? [] : text.split(/\r?\n/);
  return {
    lineCount: lines.length,
    nonEmptyLineCount: lines.filter((line) => line.trim()).length,
  };
}

function makeArtifactRecord(input) {
  const artifactPath = normalizeArtifactPath(input.path);
  const content = input.content == null ? "" : String(input.content);
  const hash = sha256(content);
  const kind = inferArtifactKind(artifactPath, input.kind);
  const stats = lineStats(content);

  return {
    id: input.id || `artifact:${hash.slice(0, 16)}`,
    path: artifactPath,
    kind,
    role: input.role || defaultRoleForKind(kind),
    sha256: hash,
    sizeBytes: Buffer.byteLength(content),
    license: input.license || null,
    createdBy: input.createdBy || "unknown",
    derivedFrom: (input.derivedFrom || []).map(normalizeArtifactPath),
    metadata: input.metadata || {},
    preview: buildPreviewDescriptor(artifactPath, kind, content, stats),
  };
}

function defaultRoleForKind(kind) {
  if (kind === "dataset") return "research-data";
  if (kind === "code") return "analysis-code";
  if (kind === "figure") return "research-output";
  if (kind === "environment") return "execution-environment";
  if (kind === "model") return "trained-model";
  return "supplementary-material";
}

function buildPreviewDescriptor(artifactPath, kind, content, stats) {
  if (kind === "dataset" && [".csv", ".tsv"].includes(path.extname(artifactPath).toLowerCase())) {
    const delimiter = path.extname(artifactPath).toLowerCase() === ".tsv" ? "\t" : ",";
    const firstLine = String(content).split(/\r?\n/)[0] || "";
    return {
      type: "tabular-preview",
      columns: firstLine ? firstLine.split(delimiter).map((column) => column.trim()).filter(Boolean) : [],
      ...stats,
    };
  }
  if (kind === "code") {
    return {
      type: "source-preview",
      language: path.extname(artifactPath).replace(".", "") || "text",
      ...stats,
    };
  }
  return {
    type: `${kind}-preview`,
    ...stats,
  };
}

function compareArtifactVersions(previous, next) {
  const sizeDeltaBytes = next.sizeBytes - previous.sizeBytes;
  const changed = previous.sha256 !== next.sha256;
  return {
    path: next.path,
    previousSha256: previous.sha256,
    nextSha256: next.sha256,
    changed,
    sizeDeltaBytes,
    lineDelta: (next.preview.lineCount || 0) - (previous.preview.lineCount || 0),
    metadataChanged: stableStringify(previous.metadata) !== stableStringify(next.metadata),
  };
}

function buildProvenanceReceipt(input) {
  const artifacts = (input.artifacts || []).map(makeArtifactRecord);
  const artifactIndex = new Map();
  for (const artifact of artifacts) {
    artifactIndex.set(artifact.id, artifact);
    artifactIndex.set(artifact.path, artifact);
    artifactIndex.set(artifact.sha256, artifact);
  }

  const activities = (input.activities || []).map((activity, index) => normalizeActivity(activity, index, artifactIndex));
  const generatedAt = input.generatedAt || new Date().toISOString();
  const receiptCore = {
    projectId: input.projectId,
    title: input.title,
    doi: input.doi || null,
    license: input.license || null,
    creators: input.creators || [],
    generatedAt,
    artifacts,
    activities,
  };

  return {
    ...receiptCore,
    receiptId: `provenance:${sha256(stableStringify(receiptCore)).slice(0, 24)}`,
    fairScore: scoreFair(receiptCore),
  };
}

function normalizeActivity(activity, index, artifactIndex) {
  const used = (activity.used || []).map((ref) => resolveArtifactRef(ref, artifactIndex));
  const generated = (activity.generated || []).map((ref) => resolveArtifactRef(ref, artifactIndex));
  return {
    id: activity.id || `activity:${index + 1}`,
    type: activity.type || "analysis",
    actor: activity.actor || "unknown",
    command: activity.command || null,
    environment: activity.environment || null,
    used,
    generated,
    startedAt: activity.startedAt || null,
    completedAt: activity.completedAt || null,
    notes: activity.notes || null,
  };
}

function resolveArtifactRef(ref, artifactIndex) {
  const key = typeof ref === "string" ? ref : ref.id || ref.path || ref.sha256;
  const artifact = artifactIndex.get(key);
  if (!artifact) {
    return { missing: true, ref: key };
  }
  return { id: artifact.id, path: artifact.path, sha256: artifact.sha256, kind: artifact.kind };
}

function validateProvenanceReceipt(receipt) {
  const errors = [];
  const warnings = [];
  const artifactPaths = new Set();
  const generatedArtifactIds = new Set();

  if (!receipt.projectId) errors.push("projectId is required");
  if (!receipt.title) errors.push("title is required");
  if (!receipt.license) warnings.push("project license is missing");
  if (!receipt.creators || receipt.creators.length === 0) warnings.push("at least one creator is recommended");

  for (const artifact of receipt.artifacts || []) {
    if (artifactPaths.has(artifact.path)) {
      errors.push(`duplicate artifact path: ${artifact.path}`);
    }
    artifactPaths.add(artifact.path);

    if (!artifact.license && artifact.kind !== "environment") {
      warnings.push(`${artifact.path} has no artifact-level license`);
    }
    if (artifact.kind === "dataset" && !artifact.metadata.variables) {
      warnings.push(`${artifact.path} dataset is missing variable metadata`);
    }
    if (artifact.kind === "code" && !artifact.metadata.runtime) {
      warnings.push(`${artifact.path} code is missing runtime metadata`);
    }
  }

  for (const activity of receipt.activities || []) {
    for (const ref of [...activity.used, ...activity.generated]) {
      if (ref.missing) {
        errors.push(`${activity.id} references missing artifact: ${ref.ref}`);
      }
    }
    for (const ref of activity.generated) {
      if (!ref.missing) {
        generatedArtifactIds.add(ref.id);
      }
    }
    if (activity.generated.length > 0 && !activity.command) {
      warnings.push(`${activity.id} generates artifacts without a command`);
    }
    if (activity.command && !activity.environment) {
      warnings.push(`${activity.id} has a command but no execution environment`);
    }
  }

  for (const artifact of receipt.artifacts || []) {
    if (artifact.derivedFrom.length > 0 && !generatedArtifactIds.has(artifact.id)) {
      warnings.push(`${artifact.path} declares derivedFrom but is not generated by an activity`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    fairScore: receipt.fairScore,
  };
}

function scoreFair(receipt) {
  const checks = {
    findable: Boolean(receipt.doi || receipt.projectId) && (receipt.artifacts || []).every((artifact) => artifact.sha256),
    accessible: Boolean(receipt.license) && (receipt.artifacts || []).every((artifact) => artifact.path),
    interoperable: (receipt.artifacts || []).some((artifact) => artifact.metadata && Object.keys(artifact.metadata).length > 0),
    reusable: (receipt.artifacts || []).every((artifact) => artifact.license || artifact.kind === "environment"),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    score: Math.round((passed / Object.keys(checks).length) * 100),
    checks,
  };
}

function buildRerunPlan(receipt) {
  return (receipt.activities || []).map((activity, index) => ({
    step: index + 1,
    activityId: activity.id,
    type: activity.type,
    command: activity.command,
    environment: activity.environment,
    inputs: activity.used.map((artifact) => artifact.path || artifact.ref),
    outputs: activity.generated.map((artifact) => artifact.path || artifact.ref),
    ready: Boolean(activity.command && activity.environment) && !activity.used.some((artifact) => artifact.missing),
  }));
}

function exportJsonLd(receipt) {
  return {
    "@context": {
      schema: "https://schema.org/",
      prov: "https://www.w3.org/ns/prov#",
      datacite: "https://purl.org/spar/datacite/",
    },
    "@id": receipt.doi || receipt.projectId,
    "@type": "schema:Dataset",
    "schema:name": receipt.title,
    "schema:identifier": receipt.doi || receipt.projectId,
    "schema:license": receipt.license,
    "schema:creator": receipt.creators,
    "prov:generatedAtTime": receipt.generatedAt,
    "schema:hasPart": receipt.artifacts.map((artifact) => ({
      "@id": artifact.id,
      "@type": artifact.kind === "code" ? "schema:SoftwareSourceCode" : "schema:CreativeWork",
      "schema:name": artifact.path,
      "schema:encodingFormat": artifact.kind,
      "schema:sha256": artifact.sha256,
      "schema:license": artifact.license || receipt.license,
    })),
    "prov:wasGeneratedBy": receipt.activities.map((activity) => ({
      "@id": activity.id,
      "@type": "prov:Activity",
      "prov:used": activity.used.map((artifact) => artifact.id || artifact.ref),
      "prov:generated": activity.generated.map((artifact) => artifact.id || artifact.ref),
      "prov:wasAssociatedWith": activity.actor,
    })),
  };
}

function exportDataCite(receipt) {
  return {
    identifiers: receipt.doi ? [{ identifier: receipt.doi, identifierType: "DOI" }] : [],
    creators: receipt.creators.map((creator) => ({ name: creator })),
    titles: [{ title: receipt.title }],
    publisher: "SCIBASE.AI artifact provenance chain",
    publicationYear: new Date(receipt.generatedAt).getUTCFullYear(),
    types: { resourceTypeGeneral: "Dataset", resourceType: "Research artifact bundle" },
    rightsList: receipt.license ? [{ rights: receipt.license }] : [],
    descriptions: [
      {
        descriptionType: "TechnicalInfo",
        description: `Receipt ${receipt.receiptId} tracks ${receipt.artifacts.length} artifacts and ${receipt.activities.length} provenance activities.`,
      },
    ],
  };
}

module.exports = {
  buildProvenanceReceipt,
  buildRerunPlan,
  compareArtifactVersions,
  exportDataCite,
  exportJsonLd,
  inferArtifactKind,
  makeArtifactRecord,
  sha256,
  stableStringify,
  validateProvenanceReceipt,
};