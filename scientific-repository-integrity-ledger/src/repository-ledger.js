import { createHash } from "node:crypto";

const REQUIRED_COMPONENTS = Object.freeze([
  "manuscript/",
  "data/",
  "code/",
  "notebooks/",
  "results/",
  "protocols/",
  "metadata.json"
]);

function sha256(value) {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(input).digest("hex");
}

function shortHash(value) {
  return sha256(value).slice(0, 12);
}

export function buildRepositoryManifest(repository) {
  const components = REQUIRED_COMPONENTS.map((path) => {
    const files = repository.files.filter((file) => file.path === path || file.path.startsWith(path));
    return {
      path,
      present: files.length > 0,
      fileCount: files.length,
      bytes: files.reduce((sum, file) => sum + file.bytes, 0)
    };
  });
  const missing = components.filter((component) => !component.present).map((component) => component.path);
  const manifest = {
    repositoryId: repository.id,
    title: repository.title,
    version: repository.version,
    doi: repository.doi,
    authors: repository.authors,
    components,
    missing,
    complete: missing.length === 0
  };
  return {
    ...manifest,
    manifestHash: sha256(manifest)
  };
}

export function buildContentIndex(repository) {
  return repository.files
    .map((file) => ({
      path: file.path,
      bytes: file.bytes,
      kind: file.kind,
      sha256: sha256(`${repository.id}:${file.path}:${file.content}`)
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function createCommit(repository, { parent = null, message, author, touchedPaths }) {
  const contentIndex = buildContentIndex(repository).filter((file) => touchedPaths.includes(file.path));
  const payload = {
    parent,
    message,
    author,
    touchedPaths,
    contentHashes: contentIndex.map((file) => file.sha256)
  };
  return {
    id: `commit:${shortHash(JSON.stringify(payload))}`,
    parent,
    message,
    author,
    touchedPaths,
    contentHashes: contentIndex,
    timestamp: repository.clock
  };
}

export function createSemanticTag(repository, commit, label) {
  return {
    label,
    commitId: commit.id,
    doi: `${repository.doi}.${label.replace(/[^0-9A-Za-z]+/g, "-")}`,
    citation: `${repository.authors.join(", ")} (${repository.year}). ${repository.title} ${label}. SCIBASE. https://doi.org/${repository.doi}`,
    immutableSnapshotHash: sha256(`${repository.id}:${commit.id}:${label}`)
  };
}

export function buildForkRecord(parentRepository, forkRepository) {
  return {
    forkId: forkRepository.id,
    parentId: parentRepository.id,
    attribution: parentRepository.authors,
    inheritedDoi: parentRepository.doi,
    derivedTitle: forkRepository.title,
    provenanceHash: sha256(`${parentRepository.id}:${forkRepository.id}:${forkRepository.title}`)
  };
}

export function buildMergeRequest(repository, branchName, commits) {
  const changedPaths = [...new Set(commits.flatMap((commit) => commit.touchedPaths))].sort();
  const reproducibility = runReproducibilityChecks(repository);
  const approvalsRequired = changedPaths.some((path) => path.startsWith("data/")) ? 2 : 1;
  return {
    id: `mr:${shortHash(`${repository.id}:${branchName}:${changedPaths.join("|")}`)}`,
    branchName,
    commitIds: commits.map((commit) => commit.id),
    changedPaths,
    discussionThreads: changedPaths.map((path) => ({ path, status: "open", commentCount: 1 })),
    approvalsRequired,
    reproducibility,
    mergeable: reproducibility.status === "passed" && commits.length > 0
  };
}

export function runReproducibilityChecks(repository) {
  const hasContainer = repository.files.some((file) => file.path === "Dockerfile" || file.path === "environment.yml");
  const hasNotebook = repository.files.some((file) => file.path.endsWith(".ipynb"));
  const hasRawData = repository.files.some((file) => file.path.startsWith("data/"));
  const score = [hasContainer, hasNotebook, hasRawData].filter(Boolean).length * 33 + (hasContainer && hasRawData ? 1 : 0);
  return {
    status: score >= 67 ? "passed" : "needs_evidence",
    score,
    checks: [
      { name: "container_environment", passed: hasContainer },
      { name: "notebook_available", passed: hasNotebook },
      { name: "raw_data_present", passed: hasRawData }
    ]
  };
}

export function buildExportBundle(repository, tag) {
  const manifest = buildRepositoryManifest(repository);
  return {
    bundleId: `${repository.id}-${tag.label}`,
    tag: tag.label,
    manifestHash: manifest.manifestHash,
    citation: tag.citation,
    files: buildContentIndex(repository),
    exportFormats: ["zip", "json-manifest", "bibtex"],
    apiPath: `/repositories/${repository.id}/exports/${tag.label}`
  };
}
