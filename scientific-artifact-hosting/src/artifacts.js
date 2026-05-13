import { createHash } from "node:crypto";

const hash = (value) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16)}`;

export function selectPreview(artifact) {
  if (artifact.mime.includes("csv") || artifact.mime.includes("spreadsheet")) return "spreadsheet-preview";
  if (artifact.path.endsWith(".ipynb")) return "notebook-render";
  if (artifact.mime.startsWith("image/")) return "image-thumbnail";
  if (artifact.type === "code") return "syntax-highlighted-code";
  if (artifact.mime.includes("json")) return "json-tree";
  if (artifact.type === "model") return "model-card";
  return "download-only";
}

export function buildArtifactManifest(artifactList) {
  const entries = artifactList.map((artifact) => ({
    id: artifact.id,
    path: artifact.path,
    folder: artifact.path.split("/").slice(0, -1).join("/") || ".",
    version: artifact.version,
    previousVersionId: artifact.previousVersionId ?? null,
    type: artifact.type,
    mime: artifact.mime,
    preview: selectPreview(artifact),
    contentHash: hash({ id: artifact.id, version: artifact.version, schema: artifact.schema ?? null, rows: artifact.rows ?? null }),
    accessUrl: artifact.accessUrl
  }));
  return {
    entries,
    byFolder: entries.reduce((acc, entry) => {
      acc[entry.folder] ??= [];
      acc[entry.folder].push(entry.id);
      return acc;
    }, {}),
    supportedTypes: [...new Set(entries.map((entry) => entry.type))].sort()
  };
}

export function diffArtifactVersions(previous, next) {
  const previousSchema = new Set(previous.schema ?? []);
  const nextSchema = new Set(next.schema ?? []);
  return {
    previousId: previous.id,
    nextId: next.id,
    addedColumns: [...nextSchema].filter((column) => !previousSchema.has(column)),
    removedColumns: [...previousSchema].filter((column) => !nextSchema.has(column)),
    rowDelta: (next.rows ?? 0) - (previous.rows ?? 0),
    changed: previous.version !== next.version || (next.rows ?? 0) !== (previous.rows ?? 0)
  };
}

export function buildMetadataExports(metadata, artifactList) {
  const datasetArtifacts = artifactList.filter((artifact) => artifact.type === "dataset");
  return {
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Dataset",
      identifier: metadata.id,
      name: metadata.title,
      author: metadata.authors,
      license: metadata.license,
      distribution: artifactList.map((artifact) => ({ "@type": "DataDownload", contentUrl: artifact.accessUrl, encodingFormat: artifact.mime }))
    },
    dataCite: {
      identifier: datasetArtifacts[datasetArtifacts.length - 1]?.doi,
      creators: metadata.authors.map((name) => ({ name })),
      titles: [{ title: metadata.title }],
      publisher: metadata.publisher,
      publicationYear: 2026,
      fundingReferences: metadata.funding
    },
    schemaOrg: {
      name: metadata.title,
      version: metadata.schemaVersion,
      url: metadata.apiBaseUrl,
      keywords: [...new Set(artifactList.flatMap((artifact) => artifact.tags.keywords))]
    }
  };
}

export function evaluateFairCompliance(metadata, artifactList) {
  const latestDataset = artifactList.filter((artifact) => artifact.type === "dataset").at(-1);
  const checks = [
    { principle: "Findable", passed: Boolean(latestDataset?.doi), evidence: latestDataset?.doi ?? null },
    { principle: "Accessible", passed: artifactList.every((artifact) => Boolean(artifact.accessUrl)), evidence: "persistent access URLs" },
    { principle: "Interoperable", passed: artifactList.some((artifact) => ["text/csv", "application/x-ipynb+json"].includes(artifact.mime)), evidence: "machine-readable formats" },
    { principle: "Reusable", passed: artifactList.every((artifact) => Boolean(artifact.license)) && Boolean(metadata.license), evidence: "licenses and metadata" },
    { principle: "API", passed: Boolean(metadata.apiBaseUrl), evidence: metadata.apiBaseUrl }
  ];
  return {
    checks,
    score: Math.round((checks.filter((check) => check.passed).length / checks.length) * 100),
    status: checks.every((check) => check.passed) ? "fair-ready" : "needs-curation"
  };
}

export function buildTagIndex(artifactList) {
  const groups = { keywords: new Set(), instruments: new Set(), organisms: new Set(), variables: new Set() };
  for (const artifact of artifactList) {
    for (const key of Object.keys(groups)) {
      for (const value of artifact.tags[key] ?? []) groups[key].add(value);
    }
  }
  return Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, [...values].sort()]));
}

export function buildRuntimePlan(runtime) {
  return {
    id: runtime.id,
    engine: runtime.engine,
    image: runtime.image,
    environmentFiles: runtime.environmentFiles,
    resources: runtime.resources,
    commands: runtime.commands,
    sandboxed: true,
    ready: Boolean(runtime.image && runtime.commands.length > 0)
  };
}

export function buildRunPlan(runtime, artifactList) {
  const plan = buildRuntimePlan(runtime);
  return {
    runtime: plan,
    mountedArtifacts: artifactList.filter((artifact) => ["dataset", "code", "notebook", "model"].includes(artifact.type)).map((artifact) => artifact.path),
    expectedOutputs: artifactList.filter((artifact) => ["figure", "results", "model"].includes(artifact.type)).map((artifact) => artifact.path),
    status: plan.ready ? "ready-to-run" : "missing-runtime"
  };
}

export function buildComputeTriggers(triggerList, runtime) {
  return triggerList.map((trigger) => ({
    ...trigger,
    runtimeId: runtime.id,
    sandboxed: true,
    enabled: runtime.commands.includes(trigger.command) || trigger.type === "cron"
  }));
}

export function buildHostingDashboard({ metadata, artifacts, runtime, triggers }) {
  return {
    manifest: buildArtifactManifest(artifacts),
    metadata: buildMetadataExports(metadata, artifacts),
    fair: evaluateFairCompliance(metadata, artifacts),
    diff: diffArtifactVersions(artifacts[0], artifacts[1]),
    tags: buildTagIndex(artifacts),
    runPlan: buildRunPlan(runtime, artifacts),
    triggers: buildComputeTriggers(triggers, runtime)
  };
}
