"use strict"

const crypto = require("node:crypto")
const path = require("node:path")

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex")
}

function artifactType(filePath) {
  const ext = path.extname(filePath || "").toLowerCase()
  if ([".csv", ".tsv", ".xlsx", ".parquet", ".json"].includes(ext)) return "dataset"
  if ([".ipynb", ".py", ".r", ".jl"].includes(ext)) return "code"
  if ([".png", ".jpg", ".jpeg", ".svg", ".tif", ".tiff"].includes(ext)) return "image"
  if ([".mp4", ".mov", ".avi"].includes(ext)) return "media"
  if ([".pt", ".onnx", ".pkl", ".safetensors"].includes(ext)) return "model"
  return "supplement"
}

function previewKindFor(type) {
  return {
    dataset: "table",
    code: "notebook-or-code",
    image: "thumbnail",
    media: "poster-frame",
    model: "model-card",
    supplement: "metadata-card",
  }[type]
}

function isSensitiveField(field) {
  return /patient|subject|email|phone|ssn|dob|birth|address|lat|lon|geo|location|participant/i.test(field)
}

function compareColumns(previous = [], current = []) {
  const prevSet = new Set(previous)
  const currSet = new Set(current)
  return {
    added: current.filter((column) => !prevSet.has(column)),
    removed: previous.filter((column) => !currSet.has(column)),
  }
}

function normalizeArtifact(artifact) {
  return {
    id: artifact.id,
    path: artifact.path || "",
    version: artifact.version || null,
    hash: artifact.hash || null,
    schemaVersion: artifact.schemaVersion || artifact.metadata?.schemaVersion || null,
    access: artifact.access || "private",
    metadata: artifact.metadata || {},
    preview: artifact.preview || null,
    previousVersion: artifact.previousVersion || null,
  }
}

function evaluateArtifact(artifactInput) {
  const artifact = normalizeArtifact(artifactInput)
  const type = artifactType(artifact.path)
  const expectedPreviewKind = previewKindFor(type)
  const blockers = []
  const warnings = []
  const refreshReasons = []
  const metadataDigest = digest(artifact.metadata)
  const columns = artifact.metadata.columns || []
  const sensitiveFields = columns.filter(isSensitiveField)

  if (!artifact.id) blockers.push("artifact is missing an id")
  if (!artifact.path) blockers.push("artifact is missing a path")
  if (!artifact.version) blockers.push(`${artifact.id || "artifact"} is missing an upload version`)
  if (!artifact.hash) blockers.push(`${artifact.id || "artifact"} is missing a content hash`)

  for (const field of ["title", "license", "creators"]) {
    if (!artifact.metadata[field]) warnings.push(`${artifact.id} metadata is missing ${field}`)
  }
  if (artifact.access === "public" && !artifact.metadata.doi && !artifact.metadata.persistentId) {
    warnings.push(`${artifact.id} public artifact is missing DOI or persistentId metadata`)
  }

  if (!artifact.preview) {
    refreshReasons.push("preview is missing")
  } else {
    if (artifact.preview.kind !== expectedPreviewKind) {
      refreshReasons.push(`preview kind ${artifact.preview.kind} should be ${expectedPreviewKind}`)
    }
    if (artifact.preview.generatedFromHash !== artifact.hash) {
      refreshReasons.push("preview content hash is stale")
    }
    if (artifact.preview.generatedFromVersion !== artifact.version) {
      refreshReasons.push("preview upload version is stale")
    }
    if (artifact.preview.schemaVersion !== artifact.schemaVersion) {
      refreshReasons.push("preview schema version is stale")
    }
    if (artifact.preview.metadataDigest !== metadataDigest) {
      refreshReasons.push("preview metadata snapshot is stale")
    }
  }

  const redactedFields = new Set(artifact.preview?.redactedFields || [])
  const unredactedSensitiveFields = sensitiveFields.filter((field) => !redactedFields.has(field))
  if (unredactedSensitiveFields.length > 0) {
    blockers.push(`${artifact.id} preview exposes sensitive fields: ${unredactedSensitiveFields.join(", ")}`)
  }

  const previousColumns = artifact.previousVersion?.metadata?.columns || []
  const columnDiff = compareColumns(previousColumns, columns)
  const changedHash = artifact.previousVersion?.hash && artifact.previousVersion.hash !== artifact.hash
  const diffSummary = {
    changedHash: Boolean(changedHash),
    addedColumns: columnDiff.added,
    removedColumns: columnDiff.removed,
  }

  const action =
    blockers.length > 0 ? "hold-preview" : refreshReasons.length > 0 ? "regenerate-preview" : "reuse-preview"

  return {
    id: artifact.id,
    path: artifact.path,
    type,
    expectedPreviewKind,
    action,
    blockers,
    warnings,
    refreshReasons,
    diffSummary,
    metadataDigest,
  }
}

function assessArtifactPreviews(input) {
  const artifacts = (input.artifacts || []).map(evaluateArtifact)
  const blockers = artifacts.flatMap((artifact) => artifact.blockers)
  const refreshCount = artifacts.filter((artifact) => artifact.action === "regenerate-preview").length
  const warningCount = artifacts.reduce((count, artifact) => count + artifact.warnings.length, 0)
  const previewPlan = artifacts.map((artifact) => ({
    artifactId: artifact.id,
    action: artifact.action,
    reason: artifact.blockers[0] || artifact.refreshReasons[0] || artifact.warnings[0] || "preview is current",
  }))
  const fairWarnings = artifacts.flatMap((artifact) =>
    artifact.warnings.map((warning) => ({ artifactId: artifact.id, warning })),
  )

  const result = {
    status: blockers.length > 0 ? "blocked" : refreshCount > 0 ? "needs-refresh" : warningCount > 0 ? "needs-review" : "ready",
    artifactCount: artifacts.length,
    refreshCount,
    blockedCount: artifacts.filter((artifact) => artifact.action === "hold-preview").length,
    artifacts,
    previewPlan,
    fairWarnings,
  }

  return {
    ...result,
    auditDigest: digest(result),
  }
}

module.exports = {
  assessArtifactPreviews,
}
