export const institution = {
  id: "inst-northbridge",
  name: "Northbridge Institute for Open Science",
  projects: [
    {
      id: "proj-climate-models",
      title: "Regional Climate Model Reproducibility Pack",
      version: "v2.1.0",
      doi: "10.5555/scibase.climate.v2",
      lab: "Climate Systems Lab",
      visibility: "public",
      storageGb: 42,
      authors: ["Ada Rivera", "Mina Okafor"],
      files: [
        "metadata.json",
        "manuscript/main.md",
        "data/README.md",
        "figures/figure-1.png",
        "compliance/open-access.json",
        "compliance/reproducibility.json"
      ],
      fileHashes: {
        "metadata.json": "a7d9b89f",
        "manuscript/main.md": "0cd2a522",
        "data/README.md": "91f1de0a",
        "figures/figure-1.png": "ff80c4ba",
        "compliance/open-access.json": "1b9230de",
        "compliance/reproducibility.json": "832710fd"
      },
      compliance: {
        openAccess: true,
        funderMandate: "NSF-OPEN-2026",
        reproducibilityScore: 92
      },
      exportRequests: [
        { target: "zenodo", status: "ready" },
        { target: "funderReport", status: "ready" }
      ]
    },
    {
      id: "proj-cell-atlas",
      title: "Single Cell Atlas Methods Note",
      version: "v0.9.3",
      doi: "10.5555/scibase.cell-atlas.preview",
      lab: "Cell Systems Lab",
      visibility: "institutional",
      storageGb: 18,
      authors: ["Noor Chen"],
      files: ["metadata.json", "manuscript/main.md", "figures/figure-1.png"],
      fileHashes: {
        "metadata.json": "fab31109",
        "manuscript/main.md": "1bfa9420",
        "figures/figure-1.png": "47c5bc89"
      },
      compliance: {
        openAccess: false,
        funderMandate: "NIH-PUBLIC-ACCESS",
        reproducibilityScore: 66
      },
      exportRequests: [{ target: "pubmedCentral", status: "blocked" }]
    },
    {
      id: "proj-neuro-protocols",
      title: "Open Neuro Protocol Benchmark",
      version: "v1.0.0",
      doi: "10.5555/scibase.neuro.protocols",
      lab: "Cell Systems Lab",
      visibility: "public",
      storageGb: 27,
      authors: ["Ilya Novak", "Samira Bell"],
      files: ["metadata.json", "manuscript/main.md", "data/README.md", "compliance/reproducibility.json"],
      fileHashes: {
        "metadata.json": "2cd93d66",
        "manuscript/main.md": "9fb16a41",
        "data/README.md": "7a865ab3",
        "compliance/reproducibility.json": "f229f140"
      },
      compliance: {
        openAccess: true,
        funderMandate: "EU-HORIZON-OPEN",
        reproducibilityScore: 84
      },
      exportRequests: [{ target: "zenodo", status: "ready" }]
    }
  ]
};
