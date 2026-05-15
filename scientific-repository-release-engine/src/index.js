import { createHash } from "node:crypto";

const REQUIRED_COMPONENTS = [
  "manuscript",
  "data",
  "code",
  "notebooks",
  "results",
  "protocols",
  "metadata",
];

export function buildComponentManifest(repository) {
  if (!repository.id || !repository.title) throw new Error("repository requires id and title");
  const components = repository.components || {};
  const coverage = REQUIRED_COMPONENTS.map((type) => ({
    type,
    present: Array.isArray(components[type]) && components[type].length > 0,
    files: (components[type] || []).map((file) => ({
      path: file.path,
      mediaType: file.mediaType,
      size: file.size || 0,
      lfs: (file.size || 0) >= (repository.lfsThreshold || 50_000_000),
      hash: hash(file),
    })),
  }));

  return {
    repositoryId: repository.id,
    title: repository.title,
    version: repository.version || "0.0.0",
    missingComponents: coverage.filter((item) => !item.present).map((item) => item.type),
    components: coverage,
    manifestHash: hash({ id: repository.id, title: repository.title, coverage }),
  };
}

export function createCommitRecord(repository, changeSet) {
  const parentHash = repository.latestCommitHash || "root";
  const changedFiles = changeSet.files || [];
  return {
    commitHash: hash({ parentHash, changedFiles, message: changeSet.message }),
    parentHash,
    author: changeSet.author,
    message: changeSet.message,
    branch: changeSet.branch || "main",
    changedFiles: changedFiles.map((file) => ({
      path: file.path,
      action: file.action || "modified",
      hash: hash(file),
    })),
    provenance: {
      generatedAt: changeSet.generatedAt || new Date(0).toISOString(),
      contributorRole: changeSet.contributorRole || "contributor",
    },
  };
}

export function diffDatasetRows(beforeRows, afterRows, key = "id") {
  const before = new Map(beforeRows.map((row) => [row[key], row]));
  const after = new Map(afterRows.map((row) => [row[key], row]));
  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, row] of after) {
    if (!before.has(id)) {
      added.push(id);
    } else if (hash(before.get(id)) !== hash(row)) {
      changed.push(id);
    }
  }
  for (const [id] of before) {
    if (!after.has(id)) removed.push(id);
  }

  return { key, added, removed, changed };
}

export function runReproducibilityGate(repository, run) {
  const checks = [
    { id: "manifest-complete", passed: buildComponentManifest(repository).missingComponents.length === 0 },
    { id: "environment-defined", passed: Boolean(run.environment?.dockerfile || run.environment?.conda) },
    { id: "raw-to-results-link", passed: Boolean(run.inputs?.length && run.outputs?.length) },
    { id: "sandbox-policy", passed: run.sandbox === "restricted" || run.sandbox === "isolated" },
  ];
  const passed = checks.filter((check) => check.passed).length;
  return {
    status: passed === checks.length ? "passed" : "blocked",
    passed,
    failed: checks.length - passed,
    checks,
  };
}

export function createReleaseTag(repository, options) {
  if (!/^v?\d+\.\d+\.\d+/.test(options.version)) {
    throw new Error("release version must be semantic, for example v1.0.0");
  }
  const manifest = buildComponentManifest({ ...repository, version: options.version });
  const reproducibility = runReproducibilityGate(repository, options.reproducibilityRun || {});
  return {
    tag: options.version,
    label: options.label || options.version,
    doi: options.doi || null,
    citation: formatCitation(repository, options),
    releaseHash: hash({ manifestHash: manifest.manifestHash, tag: options.version, doi: options.doi }),
    ready: manifest.missingComponents.length === 0 && reproducibility.status === "passed",
    blockers: [
      ...manifest.missingComponents.map((component) => `missing_component:${component}`),
      ...(reproducibility.status === "passed" ? [] : ["reproducibility_gate_blocked"]),
    ],
  };
}

export function buildExportBundle(repository, releaseTag) {
  const manifest = buildComponentManifest(repository);
  return {
    filename: `${repository.id}-${releaseTag.tag.replace(/^v/, "")}.zip`,
    manifestHash: manifest.manifestHash,
    releaseHash: releaseTag.releaseHash,
    files: manifest.components.flatMap((component) =>
      component.files.map((file) => ({ component: component.type, path: file.path, hash: file.hash })),
    ),
    apiRoutes: [
      `GET /projects/${repository.id}`,
      `GET /projects/${repository.id}/data`,
      `GET /projects/${repository.id}/releases/${releaseTag.tag}`,
    ],
    cli: `scibase clone ${repository.id}@${releaseTag.tag}`,
  };
}

export function buildRepositoryRelease(repository, changeSet, options) {
  const manifest = buildComponentManifest(repository);
  const commit = createCommitRecord(repository, changeSet);
  const releaseTag = createReleaseTag({ ...repository, latestCommitHash: commit.commitHash }, options);
  const exportBundle = buildExportBundle(repository, releaseTag);
  return {
    repositoryId: repository.id,
    manifest,
    commit,
    releaseTag,
    exportBundle,
    auditHash: hash({ manifest, commit, releaseTag, exportBundle }),
  };
}

function formatCitation(repository, options) {
  const authors = (repository.authors || []).map((author) => author.name).join(", ");
  const year = options.year || new Date(options.publishedAt || "2026-01-01").getUTCFullYear();
  return `${authors} (${year}). ${repository.title} (${options.version}). SCIBASE.AI.${options.doi ? ` https://doi.org/${options.doi}` : ""}`;
}

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

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
