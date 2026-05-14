export const sampleManifest = {
  metadata: {
    identifier: "doi:10.5555/scibase.demo.2026",
    title: "Heat Resilience Neighborhood Dataset",
    creators: ["SCIBASE Demo Lab"],
    license: "CC-BY-4.0",
    access: "public",
    keywords: ["urban heat", "tree canopy", "emergency visits"],
    version: "1.2.0",
    publisher: "SCIBASE",
    publicationYear: 2026,
  },
  artifacts: [
    {
      path: "data/neighborhood_heat.csv",
      sizeBytes: 248912,
      checksum: "sha256:4ef4d2a3",
      mediaType: "text/csv",
      variables: ["neighborhood_id", "canopy_percent", "daily_temperature", "emergency_visits"],
      description: "Clean analysis dataset.",
    },
    {
      path: "analysis/reproduce.py",
      sizeBytes: 8912,
      checksum: "sha256:a2a9ce01",
      mediaType: "text/x-python",
      description: "Reproduction script for tables and figures.",
    },
    {
      path: "notebooks/exploration.ipynb",
      sizeBytes: 44002,
      checksum: "sha256:bb1287aa",
      mediaType: "application/x-ipynb+json",
      description: "Exploratory notebook.",
    },
  ],
  versionChanges: {
    added: ["notebooks/exploration.ipynb"],
    modified: ["data/neighborhood_heat.csv"],
    removed: [],
  },
  execution: {
    runtime: "python-3.12",
    environmentFile: "environment.yml",
    command: "python analysis/reproduce.py",
    entryArtifact: "analysis/reproduce.py",
  },
};
