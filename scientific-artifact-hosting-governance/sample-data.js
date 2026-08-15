const previousDataset = {
  id: "artifact-cell-counts",
  name: "cell-counts.csv",
  version: "1.0",
  license: "CC-BY-4.0",
  access: "public",
  persistentId: "10.5555/scibase.cell-counts.v1",
  metadata: {
    title: "Cell count measurements",
    creators: ["Demo Lab"],
    description: "Baseline cell-count measurements for a synthetic reproducibility package.",
    keywords: ["cell-count", "reproducibility", "synthetic"],
  },
  content: "sample,condition,count\nA,control,10\nB,treatment,12\n",
};

const project = {
  id: "project-reproducible-cells-001",
  title: "Synthetic cell-count reproducibility package",
  description: "A privacy-safe sample package showing data, code, notebook, metadata, versioning, and runtime readiness.",
  creators: ["Demo Lab", "SCIBASE Reviewer"],
  keywords: ["FAIR", "data hosting", "code hosting", "reproducibility"],
  license: "CC-BY-4.0",
  publisher: "SCIBASE.AI",
  publicationYear: 2026,
  persistentId: "10.5555/scibase.reproducible-cells",
  previousArtifacts: [previousDataset],
  artifacts: [
    {
      ...previousDataset,
      version: "1.1",
      content: "sample,condition,count\nA,control,10\nB,treatment,13\nC,treatment,15\n",
    },
    {
      id: "artifact-analysis-code",
      name: "analysis.py",
      version: "1.0",
      license: "MIT",
      access: "public",
      persistentId: "analysis.py",
      language: "python",
      metadata: {
        title: "Analysis script",
        creators: ["Demo Lab"],
        description: "Synthetic analysis script for the reproducibility package.",
        keywords: ["python", "analysis", "reproducibility"],
      },
      content: "print('run reproducibility analysis')\n",
    },
    {
      id: "artifact-notebook",
      name: "reproduce.ipynb",
      version: "1.0",
      license: "MIT",
      access: "private",
      persistentId: "reproduce.ipynb",
      metadata: {
        title: "Reproducibility notebook",
        creators: ["Demo Lab"],
        description: "Synthetic notebook renderer fixture.",
        keywords: ["jupyter", "notebook"],
      },
      content: {
        cells: [{cell_type: "markdown", source: ["# Reproduce synthetic result"]}],
        metadata: {},
        nbformat: 4,
        nbformat_minor: 5,
      },
    },
  ],
  executionEnvironment: {
    type: "docker",
    image: "python:3.12-slim",
    commands: ["python analysis.py"],
  },
};

module.exports = {
  previousDataset,
  project,
};
