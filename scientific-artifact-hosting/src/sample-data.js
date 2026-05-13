export const artifacts = [
  {
    id: "artifact-counts-v1",
    path: "data/raw-counts-v1.csv",
    version: "1.0.0",
    type: "dataset",
    mime: "text/csv",
    rows: 1200,
    schema: ["cell_id", "gene", "count"],
    license: "CC-BY-4.0",
    accessUrl: "https://scibase.example/artifacts/counts-v1",
    doi: "10.0000/scibase.counts.v1",
    tags: { keywords: ["single-cell"], instruments: ["NovaSeq"], organisms: ["human"], variables: ["gene", "count"] }
  },
  {
    id: "artifact-counts-v2",
    path: "data/raw-counts-v2.csv",
    version: "1.1.0",
    previousVersionId: "artifact-counts-v1",
    type: "dataset",
    mime: "text/csv",
    rows: 1305,
    schema: ["cell_id", "gene", "count", "batch"],
    license: "CC-BY-4.0",
    accessUrl: "https://scibase.example/artifacts/counts-v2",
    doi: "10.0000/scibase.counts.v2",
    tags: { keywords: ["single-cell"], instruments: ["NovaSeq"], organisms: ["human"], variables: ["gene", "count", "batch"] }
  },
  {
    id: "artifact-analysis",
    path: "code/analysis.py",
    version: "1.0.0",
    type: "code",
    mime: "text/x-python",
    license: "MIT",
    accessUrl: "https://scibase.example/artifacts/analysis.py",
    tags: { keywords: ["analysis"], instruments: [], organisms: [], variables: ["response_index"] }
  },
  {
    id: "artifact-notebook",
    path: "notebooks/run_analysis.ipynb",
    version: "1.0.0",
    type: "notebook",
    mime: "application/x-ipynb+json",
    license: "MIT",
    accessUrl: "https://scibase.example/artifacts/run_analysis.ipynb",
    tags: { keywords: ["reproducibility"], instruments: [], organisms: [], variables: ["seed"] }
  },
  {
    id: "artifact-model",
    path: "models/response-ranker.pt",
    version: "1.0.0",
    type: "model",
    mime: "application/octet-stream",
    license: "Apache-2.0",
    accessUrl: "https://scibase.example/artifacts/response-ranker.pt",
    tags: { keywords: ["model"], instruments: [], organisms: [], variables: ["weights"] }
  }
];

export const repositoryMetadata = {
  id: "repo-organoid-response",
  title: "Organoid perturbation response atlas",
  authors: ["Alina Chen", "Mateo Ruiz"],
  publisher: "SCIBASE.AI",
  funding: ["BIO-2026-114"],
  schemaVersion: "2026-05",
  apiBaseUrl: "https://api.scibase.example/repos/repo-organoid-response",
  license: "CC-BY-4.0"
};

export const runtime = {
  id: "runtime-organoid-analysis",
  engine: "docker",
  image: "ghcr.io/scibase/organoid-analysis:2026-05",
  environmentFiles: ["Dockerfile", "environment.yml"],
  resources: { cpu: 4, memoryGb: 16, gpu: false },
  commands: ["python code/analysis.py", "jupyter nbconvert --execute notebooks/run_analysis.ipynb"]
};

export const triggers = [
  { id: "trigger-run-analysis", type: "manual", label: "Run analysis", command: "python code/analysis.py" },
  { id: "trigger-reproduce-results", type: "manual", label: "Reproduce results", command: "jupyter nbconvert --execute notebooks/run_analysis.ipynb" },
  { id: "trigger-weekly-refresh", type: "cron", schedule: "0 4 * * 1", command: "python code/refresh_data.py" }
];
