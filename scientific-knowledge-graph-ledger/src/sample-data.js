export const documents = [
  {
    id: "doc-heat-health",
    title: "Urban heat health benchmark with Jupyter notebooks",
    domain: "public-health",
    year: 2026,
    citationCount: 42,
    reproducibilityScore: 88,
    authors: [
      { name: "Ada Rivera", affiliation: "Northbridge University" },
      { name: "Lin Chen", affiliation: "City Health Lab" }
    ],
    abstract:
      "A benchmark dataset links heat exposure, canopy coverage, and emergency health demand.",
    body:
      "The Python and Jupyter notebook workflow uses regression and Docker. Data are published as a holdout cohort. DOI 10.1234/heat.health.2026."
  },
  {
    id: "doc-crispr-neuro",
    title: "CRISPR protocol clustering in neuroscience",
    domain: "neuroscience",
    year: 2025,
    citationCount: 136,
    reproducibilityScore: 74,
    authors: [{ name: "Mira Shah", affiliation: "Open Neuro Institute" }],
    abstract:
      "A protocol comparison for CRISPR experiments and single-cell neuroscience clustering.",
    body:
      "The dataset includes protocol notebooks, PyTorch clustering baselines, and DOI 10.5678/crispr.neuro.2025."
  },
  {
    id: "doc-repro-tools",
    title: "Reproducibility tools for scientific notebooks",
    domain: "research-infrastructure",
    year: 2024,
    citationCount: 210,
    reproducibilityScore: 92,
    authors: [{ name: "Noor Patel", affiliation: "Repro Lab" }],
    abstract:
      "Jupyter and Docker workflows improve notebook reproducibility for benchmark studies.",
    body:
      "The method tracks notebook execution, dataset manifests, Python versions, and DOI 10.9012/repro.tools.2024."
  }
];
