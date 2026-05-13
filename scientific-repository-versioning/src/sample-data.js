export const sampleRepository = {
  id: "repo-organoid-response",
  title: "Organoid perturbation response atlas",
  ownerId: "user-alina",
  defaultBranch: "main",
  authors: ["Alina Chen", "Mateo Ruiz"],
  affiliations: ["Northbridge University", "Open Organoid Consortium"],
  funding: ["BIO-2026-114"],
  tags: ["organoid", "single-cell", "CRISPR"],
  components: [
    { path: "manuscript/main.md", type: "manuscript", content: "Organoid response atlas manuscript", lfs: false },
    { path: "data/raw-counts.parquet", type: "data", content: "raw-counts-sha-source", lfs: true },
    { path: "code/analysis.py", type: "code", content: "print('analysis')", lfs: false },
    { path: "notebooks/run_analysis.ipynb", type: "notebook", content: "{\"cells\":[]}", lfs: false },
    { path: "results/figure-2.png", type: "results", content: "figure-binary-hash-source", lfs: true },
    { path: "protocols/organoid.md", type: "protocol", content: "Protocol v1", lfs: false },
    { path: "metadata.json", type: "metadata", content: "{\"doi\":\"10.0000/scibase.demo\"}", lfs: false }
  ],
  commits: [
    { id: "c1", parent: null, author: "user-alina", message: "initial repository", componentPaths: ["metadata.json"], at: "2026-04-01T10:00:00Z" },
    { id: "c2", parent: "c1", author: "user-alina", message: "add data and analysis", componentPaths: ["data/raw-counts.parquet", "code/analysis.py"], at: "2026-04-05T10:00:00Z" },
    { id: "c3", parent: "c2", author: "user-mateo", message: "add manuscript and results", componentPaths: ["manuscript/main.md", "results/figure-2.png"], at: "2026-04-10T10:00:00Z" }
  ],
  branches: [
    { name: "main", head: "c3" },
    { name: "experiment/qc-thresholds", head: "c2" }
  ],
  tagsByVersion: [{ name: "preprint-v1.0", commit: "c3", semanticVersion: "1.0.0" }],
  mergeRequest: {
    id: "mr-1",
    sourceBranch: "experiment/qc-thresholds",
    targetBranch: "main",
    author: "user-mateo",
    discussions: 3,
    reviews: [{ reviewer: "user-alina", state: "approved" }],
    checks: [{ name: "reproduce-analysis", state: "passed" }]
  },
  reproducibility: {
    commands: ["python code/analysis.py", "jupyter nbconvert --execute notebooks/run_analysis.ipynb"],
    environmentFiles: ["Dockerfile", "environment.yml"],
    sandbox: "firecracker-demo",
    expectedOutputs: [
      { path: "results/figure-2.png", present: true },
      { path: "results/table-1.csv", present: true }
    ]
  }
};
