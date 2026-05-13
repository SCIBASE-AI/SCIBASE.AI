import { createHash } from "node:crypto";

const REQUIRED_TYPES = ["manuscript", "data", "code", "notebook", "results", "protocol", "metadata"];

export function hashContent(content) {
  return `sha256:${createHash("sha256").update(String(content)).digest("hex").slice(0, 16)}`;
}

export function buildRepositoryManifest(repository) {
  const components = repository.components.map((component) => ({
    path: component.path,
    type: component.type,
    hash: hashContent(component.content),
    lfs: component.lfs,
    editor: buildEditorCapabilities(component.path).editor
  }));
  const presentTypes = new Set(components.map((component) => component.type));
  return {
    repositoryId: repository.id,
    title: repository.title,
    components,
    missingRequiredTypes: REQUIRED_TYPES.filter((type) => !presentTypes.has(type)),
    schemaOrg: {
      "@type": "Dataset",
      name: repository.title,
      author: repository.authors,
      keywords: repository.tags
    },
    complete: REQUIRED_TYPES.every((type) => presentTypes.has(type))
  };
}

export function createCommit(repository, { id, parent, author, message, componentPaths, at }) {
  const knownPaths = new Set(repository.components.map((component) => component.path));
  const unknownPaths = componentPaths.filter((path) => !knownPaths.has(path));
  if (unknownPaths.length > 0) throw new Error(`Unknown component paths: ${unknownPaths.join(", ")}`);
  return {
    id,
    parent,
    author,
    message,
    componentPaths,
    at,
    treeHash: hashContent(componentPaths.join("|"))
  };
}

export function createTag({ name, commit, semanticVersion }) {
  if (!/^\d+\.\d+\.\d+$/.test(semanticVersion)) {
    throw new Error(`Invalid semantic version: ${semanticVersion}`);
  }
  return { name, commit, semanticVersion, doiSuffix: semanticVersion.replaceAll(".", "-") };
}

export function buildVersionGraph(repository) {
  const commits = repository.commits.map((commit) => createCommit(repository, commit));
  return {
    commits,
    branches: repository.branches,
    tags: repository.tagsByVersion.map(createTag),
    rollbackTargets: commits.map((commit) => ({ commit: commit.id, message: commit.message }))
  };
}

export function createForkRecord(repository, { forkId, ownerId, reason }) {
  return {
    forkId,
    upstreamRepositoryId: repository.id,
    ownerId,
    reason,
    attribution: repository.authors,
    createdFromCommit: repository.branches.find((branch) => branch.name === repository.defaultBranch)?.head
  };
}

export function buildMergeRequest(repository, mergeRequest) {
  const source = repository.branches.find((branch) => branch.name === mergeRequest.sourceBranch);
  const target = repository.branches.find((branch) => branch.name === mergeRequest.targetBranch);
  const approved = mergeRequest.reviews.some((review) => review.state === "approved");
  const checksPassed = mergeRequest.checks.every((check) => check.state === "passed");
  return {
    ...mergeRequest,
    sourceHead: source?.head ?? null,
    targetHead: target?.head ?? null,
    mergeable: Boolean(source && target && approved && checksPassed),
    reviewState: approved ? "approved" : "needs-review",
    checkState: checksPassed ? "passed" : "failing"
  };
}

export function buildEditorCapabilities(path) {
  if (path.endsWith(".md")) return { editor: "markdown", diff: "rich-text" };
  if (path.endsWith(".tex")) return { editor: "latex", diff: "rich-text" };
  if (path.endsWith(".csv") || path.endsWith(".tsv")) return { editor: "table", diff: "structured-table" };
  if (path.endsWith(".json")) return { editor: "json", diff: "schema-aware-json" };
  if (path.endsWith(".ipynb")) return { editor: "jupyter", diff: "notebook-cell" };
  if (path.endsWith(".py") || path.endsWith(".r") || path.endsWith(".jl")) return { editor: "code", diff: "code-aware" };
  return { editor: "binary-or-preview", diff: "hash-only" };
}

export function buildDiffPlan(repository) {
  return repository.components.map((component) => ({
    path: component.path,
    ...buildEditorCapabilities(component.path),
    lfs: component.lfs
  }));
}

export function buildReproducibilityReport(repository) {
  const repro = repository.reproducibility;
  const checks = [
    { name: "commands", status: repro.commands.length > 0 ? "passed" : "blocked", evidence: repro.commands },
    { name: "environment", status: repro.environmentFiles.length > 0 ? "passed" : "warning", evidence: repro.environmentFiles },
    { name: "sandbox", status: repro.sandbox ? "passed" : "warning", evidence: repro.sandbox },
    ...repro.expectedOutputs.map((output) => ({
      name: `output:${output.path}`,
      status: output.present ? "passed" : "warning",
      evidence: output.path
    }))
  ];
  return {
    status: checks.some((check) => check.status === "blocked") ? "blocked" : "ready",
    checks,
    pipeline: repro.commands
  };
}

export function buildCitationRecord(repository, tagName = "preprint-v1.0") {
  const tag = repository.tagsByVersion.find((item) => item.name === tagName);
  const doi = `10.0000/scibase.${repository.id}.${tag?.semanticVersion ?? "draft"}`;
  return {
    doi,
    version: tag?.semanticVersion ?? "draft",
    apa: `${repository.authors.join(", ")}. (2026). ${repository.title} (${tagName}). SCIBASE.AI. https://doi.org/${doi}`,
    bibtex: `@dataset{${repository.id}_${tagName.replace(/\W+/g, "_")}, title={${repository.title}}, author={${repository.authors.join(" and ")}}, year={2026}, doi={${doi}}}`
  };
}

export function buildRepositoryExport(repository) {
  const manifest = buildRepositoryManifest(repository);
  const versionGraph = buildVersionGraph(repository);
  const citation = buildCitationRecord(repository);
  return {
    archiveName: `${repository.id}-${citation.version}.zip`,
    manifest,
    versionGraph,
    citation,
    citeBadge: `Cite this project: ${citation.doi}`,
    exportReady: manifest.complete && buildReproducibilityReport(repository).status === "ready"
  };
}
