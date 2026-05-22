const sampleCitationBatch = {
  id: "scibase-cmia-demo",
  manuscriptTitle: "AI-assisted perturbation mapping for neuroinflammation studies",
  toolMode: "citation_insert",
  citationStyle: "Nature",
  candidateReferences: [
    {
      id: "REF-001",
      title: "Deep perturbation atlas for microglia response screens",
      year: 2024,
      authors: ["M Nguyen", "A Patel", "R Singh"],
      doi: "10.5555/scibase.perturbation.2025.001",
      pmcid: "PMC5555001",
      url: "https://doi.org/10.5555/scibase.perturbation.2025.001",
      insertContext: "A perturbation atlas provides the nearest methodological precedent."
    },
    {
      id: "REF-002",
      title: "Deep perturbation atlas for microglia response screen",
      year: 2025,
      authors: ["Minh Nguyen", "Anika Patel", "R Singh"],
      doi: "10.5555/SCIBASE.PERTURBATION.2025.001",
      pmcid: "PMC5555001",
      url: "http://doi.org/10.5555/scibase.perturbation.2025.001",
      insertContext: "The same atlas is also suggested for the methods paragraph."
    },
    {
      id: "REF-003",
      title: "Neuroimmune benchmark folds for perturbation recovery",
      year: 2026,
      authors: ["J Alvarez", "K Okafor"],
      doi: "10.5555 scibase benchmark 2026 014",
      arxiv: "2601.1234",
      url: "https://preprints.example.org/neuroimmune-folds",
      insertContext: "Benchmark folds should be cited for validation-set construction."
    },
    {
      id: "REF-004",
      title: "Single-cell batch correction under cytokine challenge",
      year: 2025,
      authors: ["L Chen", "S Rivera"],
      doi: "10.5555/scibase.batch.2025.044",
      pmcid: "5555044",
      url: "https://doi.org/10.5555/scibase.batch.2025.044",
      insertContext: "Batch correction caveats should cite prior single-cell work."
    },
    {
      id: "REF-005",
      title: "Open notebooks for reproducible perturbation pipelines",
      year: 2025,
      authors: ["P Gomez", "N Hart"],
      doi: "10.5555/scibase.notebooks.2025.018",
      arxiv: "2503.11880v2",
      url: "https://doi.org/10.5555/scibase.notebooks.2025.018",
      insertContext: "Notebook availability should be cited in the reproducibility summary."
    },
    {
      id: "REF-006",
      title: "Human cytokine panel validation for microglia assays",
      year: 2023,
      authors: ["A Patel", "M Nguyen"],
      doi: "10.5555/scibase.cytokine.2023.071",
      url: "notaurl",
      insertContext: "The cytokine validation paragraph needs an assay citation."
    }
  ],
  canonicalRecords: [
    {
      canonicalId: "CAN-001",
      title: "Deep perturbation atlas for microglia response screens",
      year: 2025,
      authors: ["Minh Nguyen", "Anika Patel", "Ravi Singh"],
      doi: "10.5555/scibase.perturbation.2025.001",
      pmcid: "PMC5555001",
      url: "https://doi.org/10.5555/scibase.perturbation.2025.001",
      source: "Synthetic DOI Registry"
    },
    {
      canonicalId: "CAN-002",
      title: "Neuroimmune benchmark folds for perturbation recovery",
      year: 2026,
      authors: ["Julia Alvarez", "Kemi Okafor"],
      doi: "10.5555/scibase.benchmark.2026.014",
      arxiv: "2601.12345",
      url: "https://doi.org/10.5555/scibase.benchmark.2026.014",
      source: "Synthetic Preprint Index"
    },
    {
      canonicalId: "CAN-003",
      title: "Single-cell batch correction under cytokine challenge",
      year: 2025,
      authors: ["Li Chen", "Sofia Rivera"],
      doi: "10.5555/scibase.batch.2025.044",
      pmcid: "PMC5555044",
      url: "https://doi.org/10.5555/scibase.batch.2025.044",
      source: "Synthetic PubMed Central Mirror"
    },
    {
      canonicalId: "CAN-004",
      title: "Open notebooks for reproducible perturbation pipelines",
      year: 2025,
      authors: ["Paula Gomez", "Noah Hart"],
      doi: "10.5555/scibase.notebooks.2025.018",
      arxiv: "2503.11880v2",
      url: "https://doi.org/10.5555/scibase.notebooks.2025.018",
      source: "Synthetic Repository Index"
    },
    {
      canonicalId: "CAN-005",
      title: "Human cytokine panel validation for microglia assays",
      year: 2024,
      authors: ["Anika Patel", "Minh Nguyen"],
      doi: "10.5555/scibase.cytokine.2023.071",
      url: "https://doi.org/10.5555/scibase.cytokine.2023.071",
      source: "Synthetic DOI Registry"
    }
  ]
};

module.exports = { sampleCitationBatch };
