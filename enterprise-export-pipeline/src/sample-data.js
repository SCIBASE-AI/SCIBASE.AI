export const sampleProject = {
  id: "sci-project-astro-042",
  title: "Open Spectral Catalog for Nearby Exoplanet Atmospheres",
  abstract:
    "A reproducible catalog of near-infrared spectra, analysis notebooks, and validation protocols for comparing exoplanet atmospheric retrieval methods.",
  version: "v2.1.0",
  releaseTag: "preprint-v2.1",
  doi: "10.5555/scibase.exoplanet.042",
  license: "CC-BY-4.0",
  visibility: "public",
  updatedAt: "2026-05-14T00:00:00.000Z",
  repositoryUrl: "https://scibase.ai/projects/sci-project-astro-042",
  authors: [
    {
      name: "Dr. Mira Shah",
      orcid: "0000-0002-1825-0097",
      affiliation: "Northbridge Institute for Astrophysics",
      roles: ["conceptualization", "writing", "supervision"]
    },
    {
      name: "Leo Chen",
      orcid: "0000-0003-4431-6788",
      affiliation: "Northbridge Institute for Astrophysics",
      roles: ["software", "data curation", "formal analysis"]
    }
  ],
  funders: [
    {
      name: "National Institutes of Research",
      grantId: "NIR-R01-2042",
      mandate: "Public repository deposit within 30 days of publication"
    },
    {
      name: "Horizon Europe",
      grantId: "HE-OPENSCI-7781",
      mandate: "FAIR data management plan and final deliverable export"
    }
  ],
  citations: [
    {
      doi: "10.1038/example-method",
      title: "Retrieval benchmarks for atmospheric spectra",
      styleKeys: ["nature", "apa", "bibtex"]
    },
    {
      doi: "10.5281/zenodo.424242",
      title: "Reference molecular opacity tables",
      styleKeys: ["nature", "apa", "bibtex"]
    }
  ],
  compliance: {
    ethicsStatement: "No human or animal subjects are involved.",
    dataAvailability: "All public datasets are included in the repository export bundle.",
    openAccessStatus: "ready",
    retentionPolicy: "10 years",
    consentClass: "not-applicable",
    auditReview: "passed",
    reproducibilityScore: 0.91
  },
  versionHistory: [
    {
      tag: "v1.0.0",
      date: "2025-11-02",
      summary: "Initial catalog release with 38 spectra."
    },
    {
      tag: "v2.0.0",
      date: "2026-03-15",
      summary: "Added retrieval notebooks and uncertainty calibration."
    },
    {
      tag: "preprint-v2.1",
      date: "2026-05-14",
      summary: "Prepared preprint and enterprise export metadata."
    }
  ],
  artifacts: [
    {
      id: "manuscript-md",
      type: "manuscript",
      path: "manuscript/main.md",
      format: "markdown",
      public: true,
      sizeBytes: 86244
    },
    {
      id: "manuscript-tex",
      type: "manuscript",
      path: "manuscript/main.tex",
      format: "latex",
      public: true,
      sizeBytes: 90213
    },
    {
      id: "manuscript-jats",
      type: "manuscript",
      path: "exports/main.jats.xml",
      format: "jats",
      public: true,
      sizeBytes: 122031
    },
    {
      id: "bibtex",
      type: "references",
      path: "manuscript/references.bib",
      format: "bibtex",
      public: true,
      sizeBytes: 5512
    },
    {
      id: "dataset-spectra",
      type: "dataset",
      path: "data/spectra_catalog.csv",
      format: "csv",
      public: true,
      sizeBytes: 4821021
    },
    {
      id: "dataset-metadata",
      type: "metadata",
      path: "metadata/datacite.json",
      format: "datacite-json",
      public: true,
      sizeBytes: 6911
    },
    {
      id: "jsonld",
      type: "metadata",
      path: "metadata/schema-org.jsonld",
      format: "json-ld",
      public: true,
      sizeBytes: 7809
    },
    {
      id: "analysis-notebook",
      type: "notebook",
      path: "notebooks/reproduce_retrievals.ipynb",
      format: "ipynb",
      public: true,
      sizeBytes: 180432
    },
    {
      id: "analysis-code",
      type: "code",
      path: "code/run_retrievals.py",
      format: "python",
      public: true,
      sizeBytes: 15430
    },
    {
      id: "figure-1",
      type: "figure",
      path: "results/figures/figure-1.png",
      format: "png",
      public: true,
      sizeBytes: 841233
    },
    {
      id: "dmp",
      type: "funder-report",
      path: "compliance/data-management-plan.md",
      format: "markdown",
      public: true,
      sizeBytes: 11220
    },
    {
      id: "cover-letter",
      type: "cover-letter",
      path: "submissions/journal-cover-letter.md",
      format: "markdown",
      public: true,
      sizeBytes: 3910
    },
    {
      id: "private-review-notes",
      type: "review-notes",
      path: "internal/reviewer-response-draft.md",
      format: "markdown",
      public: false,
      sizeBytes: 9112
    }
  ]
};

export const sampleInstitution = {
  id: "northbridge",
  name: "Northbridge Institute for Astrophysics",
  repositorySystem: "DSpace",
  exportPolicy: {
    requireAuditEvidence: true,
    requireWebhookSigning: true,
    defaultEmbargoDays: 0
  },
  integrationContacts: [
    {
      lane: "repository",
      owner: "repository-ops@northbridge.example"
    },
    {
      lane: "compliance",
      owner: "research-compliance@northbridge.example"
    }
  ]
};
