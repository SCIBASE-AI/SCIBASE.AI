const TYPE_RULES = [
  { type: "dataset", extensions: [".csv", ".tsv", ".xlsx", ".json", ".parquet"] },
  { type: "code", extensions: [".py", ".r", ".jl", ".js", ".ts"] },
  { type: "notebook", extensions: [".ipynb"] },
  { type: "image", extensions: [".png", ".jpg", ".jpeg", ".tif", ".tiff"] },
  { type: "video", extensions: [".mp4", ".mov", ".webm"] },
  { type: "model", extensions: [".onnx", ".pt", ".pth", ".h5", ".pkl"] },
  { type: "instrument-output", extensions: [".mzml", ".fastq", ".bam", ".nii", ".dcm"] },
];

const REQUIRED_METADATA = ["identifier", "title", "creators", "license", "access", "keywords", "version"];

export function validateArtifactManifest(manifest) {
  const normalized = normalizeManifest(manifest);
  const metadata = validateMetadata(normalized);
  const artifacts = normalized.artifacts.map((artifact) => ({
    ...artifact,
    type: detectArtifactType(artifact),
    preview: buildPreviewSummary(artifact),
  }));
  const versionSummary = summarizeVersionChanges(normalized.versionChanges || {});
  const execution = checkExecutionReadiness(normalized.execution || {}, artifacts);
  const linkedData = buildLinkedDataExports(normalized, artifacts);
  const fairScore = scoreFairCompliance({ normalized, metadata, artifacts, execution, linkedData });
  const gate = buildGateDecision(metadata, artifacts, execution, fairScore);

  return {
    manifest: {
      identifier: normalized.metadata.identifier,
      title: normalized.metadata.title,
      version: normalized.metadata.version,
    },
    metadata,
    artifacts,
    versionSummary,
    execution,
    linkedData,
    fairScore,
    gate,
  };
}

export function normalizeManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    throw new TypeError("manifest must be an object");
  }

  return {
    metadata: manifest.metadata || {},
    artifacts: (manifest.artifacts || []).map((artifact) => ({
      path: artifact.path,
      sizeBytes: Number(artifact.sizeBytes || 0),
      checksum: artifact.checksum || "",
      mediaType: artifact.mediaType || "",
      variables: artifact.variables || [],
      description: artifact.description || "",
    })),
    versionChanges: manifest.versionChanges || {},
    execution: manifest.execution || {},
  };
}

export function validateMetadata(manifestInput) {
  const manifest = manifestInput.metadata ? manifestInput : normalizeManifest(manifestInput);
  const missing = REQUIRED_METADATA.filter((key) => {
    const value = manifest.metadata[key];
    return Array.isArray(value) ? value.length === 0 : !value;
  });

  return {
    complete: missing.length === 0,
    missing,
    creators: manifest.metadata.creators || [],
    keywords: manifest.metadata.keywords || [],
  };
}

export function detectArtifactType(artifact) {
  const path = (artifact.path || "").toLowerCase();
  const rule = TYPE_RULES.find((candidate) => candidate.extensions.some((extension) => path.endsWith(extension)));
  if (rule) return rule.type;
  if (/image|video|json|csv|parquet|notebook/i.test(artifact.mediaType || "")) {
    if (/image/i.test(artifact.mediaType)) return "image";
    if (/video/i.test(artifact.mediaType)) return "video";
    if (/json|csv|parquet/i.test(artifact.mediaType)) return "dataset";
    if (/notebook/i.test(artifact.mediaType)) return "notebook";
  }
  return "supplement";
}

export function buildPreviewSummary(artifact) {
  const type = detectArtifactType(artifact);
  const base = {
    path: artifact.path,
    type,
    checksumPresent: Boolean(artifact.checksum),
  };

  if (type === "dataset") {
    return { ...base, previewMode: "tabular", variables: artifact.variables.slice(0, 8) };
  }
  if (type === "notebook") {
    return { ...base, previewMode: "notebook-outline" };
  }
  if (type === "image") {
    return { ...base, previewMode: "thumbnail" };
  }
  if (type === "code") {
    return { ...base, previewMode: "syntax-highlighted-source" };
  }
  return { ...base, previewMode: "metadata-card" };
}

export function summarizeVersionChanges(changes) {
  const added = changes.added || [];
  const modified = changes.modified || [];
  const removed = changes.removed || [];

  return {
    added,
    modified,
    removed,
    totalChanged: added.length + modified.length + removed.length,
    summary: `${added.length} added, ${modified.length} modified, ${removed.length} removed`,
  };
}

export function checkExecutionReadiness(execution, artifacts = []) {
  const artifactPaths = new Set(artifacts.map((artifact) => artifact.path));
  const missing = [];
  if (!execution.runtime) missing.push("runtime");
  if (!execution.environmentFile) missing.push("environmentFile");
  if (!execution.command) missing.push("command");
  if (!execution.entryArtifact || !artifactPaths.has(execution.entryArtifact)) missing.push("entryArtifact");

  return {
    ready: missing.length === 0,
    missing,
    runtime: execution.runtime || null,
    command: execution.command || null,
    entryArtifact: execution.entryArtifact || null,
  };
}

export function buildLinkedDataExports(manifestInput, artifactsInput) {
  const manifest = manifestInput.metadata ? manifestInput : normalizeManifest(manifestInput);
  const artifacts = artifactsInput || manifest.artifacts.map((artifact) => ({ ...artifact, type: detectArtifactType(artifact) }));
  const metadata = manifest.metadata;

  const common = {
    identifier: metadata.identifier,
    name: metadata.title,
    version: metadata.version,
    license: metadata.license,
    keywords: metadata.keywords || [],
    creators: metadata.creators || [],
  };

  return {
    jsonld: {
      "@context": "https://schema.org",
      "@type": "Dataset",
      ...common,
      distribution: artifacts.map((artifact) => ({
        "@type": "DataDownload",
        contentUrl: artifact.path,
        encodingFormat: artifact.mediaType || artifact.type,
        sha256: artifact.checksum,
      })),
    },
    datacite: {
      identifier: metadata.identifier,
      creators: metadata.creators || [],
      titles: [{ title: metadata.title }],
      publisher: metadata.publisher || "SCIBASE",
      publicationYear: metadata.publicationYear || new Date().getUTCFullYear(),
      resourceType: "Dataset",
    },
    schemaOrg: {
      type: "Dataset",
      name: metadata.title,
      version: metadata.version,
      license: metadata.license,
      keywords: metadata.keywords || [],
    },
  };
}

export function scoreFairCompliance({ normalized, metadata, artifacts, execution, linkedData }) {
  const findable = average([
    Boolean(normalized.metadata.identifier),
    (normalized.metadata.keywords || []).length > 0,
    Boolean(linkedData.jsonld),
  ]);
  const accessible = average([
    Boolean(normalized.metadata.access),
    artifacts.every((artifact) => artifact.checksum),
  ]);
  const interoperable = average([
    Boolean(linkedData.jsonld),
    Boolean(linkedData.datacite),
    artifacts.some((artifact) => artifact.type === "dataset" || artifact.type === "notebook"),
  ]);
  const reusable = average([
    Boolean(normalized.metadata.license),
    metadata.complete,
    execution.ready,
  ]);

  const total = Number(((findable + accessible + interoperable + reusable) / 4).toFixed(3));
  return { findable, accessible, interoperable, reusable, total };
}

function buildGateDecision(metadata, artifacts, execution, fairScore) {
  const blockers = [];
  if (!metadata.complete) blockers.push(`Missing metadata: ${metadata.missing.join(", ")}`);
  if (!artifacts.length) blockers.push("No artifacts supplied.");
  if (artifacts.some((artifact) => !artifact.checksum)) blockers.push("Every artifact requires a checksum.");
  if (!execution.ready) blockers.push(`Execution metadata incomplete: ${execution.missing.join(", ")}`);

  if (blockers.length) {
    return { status: "blocked", blockers };
  }
  if (fairScore.total < 0.85) {
    return { status: "warning", blockers: [`FAIR score ${fairScore.total} is below 0.85.`] };
  }
  return { status: "accepted", blockers: [] };
}

function average(values) {
  const numeric = values.map((value) => (value ? 1 : 0));
  return Number((numeric.reduce((sum, value) => sum + value, 0) / numeric.length).toFixed(3));
}
