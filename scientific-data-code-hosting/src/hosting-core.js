import crypto from "node:crypto";

export const artifactStore = {
  projectId: "project-organoid-response",
  doiPrefix: "10.5555/scibase",
  license: "CC-BY-4.0",
  access: "persistent-link-with-project-acl",
  folders: {
    data: ["growth_curves.csv", "metadata.json", "assay_readings.parquet"],
    code: ["run_analysis.py", "model_training.ipynb"],
    results: ["figure-1.svg", "trained-model.onnx"],
    raw: ["instrument-output.raw"]
  },
  artifacts: [
    { path: "data/growth_curves.csv", type: "dataset", mime: "text/csv", bytes: 84, content: "sample,dose,response\nP001,0.1,0.83\nP001,1.0,0.32\nP002,0.1,0.74\n", tags: ["organoids", "dose response", "TP53"] },
    { path: "data/metadata.json", type: "metadata", mime: "application/json", bytes: 152, content: "{\"organism\":\"Homo sapiens\",\"instrument\":\"plate reader\",\"variables\":[\"dose\",\"response\"]}", tags: ["FAIR", "metadata"] },
    { path: "code/run_analysis.py", type: "code", mime: "text/x-python", bytes: 96, content: "import pandas as pd\nprint('fit random forest with seed 42')\n", tags: ["python", "analysis"] },
    { path: "code/model_training.ipynb", type: "notebook", mime: "application/x-ipynb+json", bytes: 128, content: "{\"cells\":[{\"cell_type\":\"code\",\"source\":[\"train_model()\"]}]}", tags: ["notebook", "training"] },
    { path: "results/figure-1.svg", type: "figure", mime: "image/svg+xml", bytes: 48, content: "<svg><text>Dose response</text></svg>", tags: ["figure"] },
    { path: "results/trained-model.onnx", type: "model", mime: "application/octet-stream", bytes: 2048, content: "onnx-model-placeholder", tags: ["model", "machine learning"] }
  ],
  versions: [
    { id: "v1", artifactPath: "data/growth_curves.csv", createdAt: "2026-05-01T10:00:00.000Z", hash: "sha256:initial", note: "Initial upload" },
    { id: "v2", artifactPath: "data/growth_curves.csv", createdAt: "2026-05-07T10:00:00.000Z", hash: "sha256:expanded", note: "Added P002 sample" }
  ],
  environments: [
    { id: "env-python", name: "Python reproducibility stack", runtime: "docker", image: "python:3.12-slim", packages: ["pandas", "scikit-learn", "jupyter"], definition: "environment.yml" },
    { id: "env-r", name: "R statistical stack", runtime: "docker", image: "rocker/r-ver:4.4", packages: ["tidyverse", "targets"], definition: "Dockerfile" },
    { id: "env-julia", name: "Julia modeling stack", runtime: "kubernetes", image: "julia:1.11", packages: ["DataFrames", "MLJ"], definition: "Project.toml" }
  ]
};

export function buildStorageManifest(store = artifactStore) {
  const artifacts = store.artifacts.map((artifact) => ({
    ...artifact,
    hash: sha256(artifact.content),
    preview: buildPreview(artifact),
    persistentUrl: `https://scibase.example/projects/${store.projectId}/files/${encodeURIComponent(artifact.path)}`
  }));
  return {
    projectId: store.projectId,
    folders: store.folders,
    totalBytes: artifacts.reduce((sum, artifact) => sum + artifact.bytes, 0),
    artifacts,
    supportedTypes: [...new Set(artifacts.map((artifact) => artifact.type))]
  };
}

export function buildMetadataBundle(store = artifactStore) {
  const manifest = buildStorageManifest(store);
  const doi = `${store.doiPrefix}.${store.projectId}.data.v2`;
  return {
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Dataset",
      identifier: doi,
      name: "Organoid chemotherapy response research artifacts",
      license: store.license,
      distribution: manifest.artifacts.map((artifact) => ({ "@type": "DataDownload", encodingFormat: artifact.mime, contentUrl: artifact.persistentUrl }))
    },
    dataCite: {
      identifier: { identifier: doi, identifierType: "DOI" },
      creators: [{ name: "Alice Chen", nameIdentifiers: [{ nameIdentifier: "0000-0002-1825-0097", schemeUri: "https://orcid.org" }] }],
      titles: [{ title: "Organoid chemotherapy response research artifacts" }],
      publisher: "SCIBASE.AI",
      publicationYear: 2026,
      resourceType: { resourceTypeGeneral: "Dataset" }
    },
    fair: {
      findable: Boolean(doi && manifest.artifacts.every((artifact) => artifact.hash)),
      accessible: store.access.includes("persistent-link"),
      interoperable: manifest.artifacts.some((artifact) => artifact.mime.includes("json") || artifact.mime.includes("csv")),
      reusable: Boolean(store.license && store.versions.length > 0)
    },
    tags: [...new Set(store.artifacts.flatMap((artifact) => artifact.tags))]
  };
}

export function diffDatasetVersions(beforeCsv, afterCsv) {
  const beforeRows = parseCsv(beforeCsv);
  const afterRows = parseCsv(afterCsv);
  const beforeKeys = new Set(beforeRows.map((row) => row.sample));
  const afterKeys = new Set(afterRows.map((row) => row.sample));
  return {
    addedSamples: [...afterKeys].filter((key) => !beforeKeys.has(key)),
    removedSamples: [...beforeKeys].filter((key) => !afterKeys.has(key)),
    rowDelta: afterRows.length - beforeRows.length,
    changedColumns: ["dose", "response"].filter((column) => beforeRows.some((row, index) => afterRows[index] && row[column] !== afterRows[index][column]))
  };
}

export function runExecutableEnvironment({ environmentId = "env-python", entrypoint = "code/run_analysis.py", schedule = "manual" } = {}, store = artifactStore) {
  const environment = store.environments.find((item) => item.id === environmentId);
  const artifact = store.artifacts.find((item) => item.path === entrypoint);
  if (!environment) throw new Error(`Unknown environment: ${environmentId}`);
  if (!artifact) throw new Error(`Unknown entrypoint: ${entrypoint}`);
  return {
    runId: `run-${environmentId}-${slug(entrypoint)}`,
    status: "passed",
    schedule,
    environment,
    entrypoint,
    sandbox: {
      isolation: environment.runtime === "kubernetes" ? "namespace" : "container",
      network: "disabled",
      cpuLimit: "2 vCPU",
      memoryLimit: "4 GB"
    },
    outputs: ["results/figure-1.svg", "results/trained-model.onnx"],
    reproducibilityScore: 96
  };
}

export function buildDashboardPayload() {
  const manifest = buildStorageManifest();
  const metadata = buildMetadataBundle();
  const baselineCsv = "sample,dose,response\nP001,0.1,0.83\nP001,1.0,0.32\n";
  const currentCsv = artifactStore.artifacts.find((artifact) => artifact.path === "data/growth_curves.csv").content;
  return {
    manifest,
    metadata,
    versionDiff: diffDatasetVersions(baselineCsv, currentCsv),
    execution: runExecutableEnvironment(),
    computeTriggers: [
      { label: "Run analysis", schedule: "manual", entrypoint: "code/run_analysis.py" },
      { label: "Reproduce results", schedule: "manual", entrypoint: "code/model_training.ipynb" },
      { label: "Nightly data refresh", schedule: "cron:0 3 * * *", entrypoint: "code/run_analysis.py" }
    ]
  };
}

function buildPreview(artifact) {
  if (artifact.mime === "text/csv") return { kind: "table", rows: parseCsv(artifact.content).slice(0, 3) };
  if (artifact.type === "notebook") return { kind: "notebook", cells: (artifact.content.match(/cell_type/g) || []).length };
  if (artifact.type === "figure") return { kind: "thumbnail", label: "SVG figure preview" };
  if (artifact.type === "code") return { kind: "code", language: artifact.path.split(".").at(-1), lines: artifact.content.trim().split("\n").length };
  return { kind: "metadata", label: artifact.mime };
}

function parseCsv(csv) {
  const [headerLine, ...rows] = csv.trim().split("\n");
  const headers = headerLine.split(",");
  return rows.map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
