export const repository = {
  id: "repo-heat-health",
  title: "Urban Heat and Respiratory Health Study",
  version: "v1.2.0",
  doi: "10.5555/scibase.heat-health",
  year: 2026,
  authors: ["Ada Rivera", "Mina Okafor"],
  clock: "2026-05-14T03:00:00Z",
  files: [
    { path: "manuscript/main.md", kind: "markdown", bytes: 18420, content: "structured manuscript" },
    { path: "data/README.md", kind: "markdown", bytes: 2320, content: "data dictionary" },
    { path: "data/raw/heat-health.csv", kind: "dataset", bytes: 920041, content: "raw weather and hospital visits" },
    { path: "code/analyze.py", kind: "python", bytes: 7810, content: "regression and validation pipeline" },
    { path: "notebooks/reproduce.ipynb", kind: "notebook", bytes: 64020, content: "notebook cells" },
    { path: "results/figure-1.png", kind: "figure", bytes: 120440, content: "chart bytes" },
    { path: "protocols/field-protocol.md", kind: "protocol", bytes: 5900, content: "sensor protocol" },
    { path: "metadata.json", kind: "metadata", bytes: 2120, content: "doi authors funding schema.org" },
    { path: "Dockerfile", kind: "environment", bytes: 640, content: "python runtime" }
  ]
};

export const forkRepository = {
  ...repository,
  id: "repo-heat-health-south",
  title: "Urban Heat and Respiratory Health Study: Southern Cohort",
  version: "v0.1.0",
  authors: ["Noor Chen"]
};
