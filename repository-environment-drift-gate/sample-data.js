"use strict";

const baselineSnapshot = {
  id: "repo-v1.4.2",
  tag: "preprint-v1.4.2",
  commit: "8b7f4aa",
  capturedAt: "2026-04-18T15:20:00.000Z",
  components: {
    manuscript: { hash: "sha256:ms-v142", path: "manuscript/main.md" },
    data: { hash: "sha256:data-v142", path: "data/crispr-screen.parquet", sizeMb: 482, lfs: true },
    code: { hash: "sha256:code-v142", path: "code/analysis.py" },
    notebook: { hash: "sha256:notebook-v142", path: "notebooks/rerun.ipynb" },
    results: { hash: "sha256:results-v142", path: "results/figures.tar" }
  },
  environment: {
    dockerfileHash: "sha256:docker-py311-r43",
    condaLockHash: "sha256:conda-py311-r43",
    python: "3.11.8",
    r: "4.3.2",
    cuda: "12.2",
    notebookKernel: "python-3.11-scibase",
    systemPackages: ["libxml2=2.11.7", "openssl=3.2.1"],
    secretsPolicy: "externalized"
  },
  reproducibility: {
    lastRerunAt: "2026-04-18T16:02:00.000Z",
    rawToResultsHash: "sha256:pipeline-v142",
    confidenceScore: 0.94
  }
};

const releaseCandidate = {
  id: "repo-v1.5.0-rc1",
  tag: "preprint-v1.5.0-rc1",
  commit: "2c91d0e",
  capturedAt: "2026-05-20T09:58:00.000Z",
  components: {
    manuscript: { hash: "sha256:ms-v150", path: "manuscript/main.md" },
    data: { hash: "sha256:data-v150", path: "data/crispr-screen.parquet", sizeMb: 517, lfs: false },
    code: { hash: "sha256:code-v150", path: "code/analysis.py" },
    notebook: { hash: "sha256:notebook-v150", path: "notebooks/rerun.ipynb" },
    results: { hash: "sha256:results-v142", path: "results/figures.tar" }
  },
  environment: {
    dockerfileHash: "sha256:docker-py312-r44",
    condaLockHash: "sha256:conda-py312-r44",
    python: "3.12.3",
    r: "4.4.0",
    cuda: "12.4",
    notebookKernel: "python-3.12-default",
    systemPackages: ["libxml2=2.12.6", "openssl=3.3.0"],
    secretsPolicy: "externalized"
  },
  reproducibility: {
    lastRerunAt: "2026-04-18T16:02:00.000Z",
    rawToResultsHash: "sha256:pipeline-v142",
    confidenceScore: 0.67
  }
};

module.exports = {
  baselineSnapshot,
  releaseCandidate
};
