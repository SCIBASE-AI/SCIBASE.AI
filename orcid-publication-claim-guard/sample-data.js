const researchers = [
  {
    id: "researcher-ada-kim",
    orcid: "0000-0002-1825-0097",
    displayName: "Ada Kim",
    aliases: ["A. Kim", "Ada M. Kim"],
    affiliations: ["Northbridge Institute", "Northbridge Bioinformatics Lab"],
    domains: ["northbridge.example"],
    knownCoauthors: ["Mina Patel", "Omar Singh", "Grace Lee"],
    profileWindow: { start: 2019, end: 2026 },
  },
  {
    id: "researcher-ada-kim-energy",
    orcid: "0000-0003-4444-7788",
    displayName: "Ada Kim",
    aliases: ["A. Kim"],
    affiliations: ["Westlake Energy Systems"],
    domains: ["westlake.example"],
    knownCoauthors: ["Evan Stone", "Priya Raman"],
    profileWindow: { start: 2021, end: 2026 },
  },
];

const existingClaims = [
  {
    doi: "10.5555/northbridge.2025.042",
    researcherId: "researcher-ada-kim",
    title: "Reproducible notebooks for kinase pathway triage",
  },
  {
    doi: "10.7777/westlake.2024.009",
    researcherId: "researcher-ada-kim-energy",
    title: "Grid-scale battery dispatch under volatile demand",
  },
];

const importedPublications = [
  {
    id: "pub-exact-orcid",
    title: "Reproducible notebooks for kinase pathway triage",
    doi: "10.5555/northbridge.2025.042",
    year: 2025,
    venue: "Journal of Computational Biology",
    status: "published",
    source: "orcid-sync",
    authors: [
      {
        name: "Ada M. Kim",
        orcid: "0000-0002-1825-0097",
        affiliation: "Northbridge Bioinformatics Lab",
      },
      { name: "Mina Patel", affiliation: "Northbridge Institute" },
    ],
  },
  {
    id: "pub-homonym-orcid-mismatch",
    title: "Hydrogen electrolyzer scheduling in microgrids",
    doi: "10.7777/westlake.2026.014",
    year: 2026,
    venue: "Energy Systems Letters",
    status: "published",
    source: "doi-crosswalk",
    authors: [
      {
        name: "Ada Kim",
        orcid: "0000-0003-4444-7788",
        affiliation: "Westlake Energy Systems",
      },
      { name: "Evan Stone", affiliation: "Westlake Energy Systems" },
    ],
  },
  {
    id: "pub-weak-but-reviewable",
    title: "Sparse pathway graphs for reproducibility audits",
    doi: "10.5555/northbridge.2026.081",
    year: 2026,
    venue: "Open Methods Review",
    status: "published",
    source: "publisher-feed",
    authors: [
      { name: "A. Kim", affiliation: "Northbridge Institute" },
      { name: "Grace Lee", affiliation: "Northbridge Institute" },
    ],
  },
  {
    id: "pub-duplicate-doi",
    title: "Grid-scale battery dispatch under volatile demand",
    doi: "10.7777/westlake.2024.009",
    year: 2024,
    venue: "Energy Systems Letters",
    status: "published",
    source: "publisher-feed",
    authors: [
      { name: "Ada Kim", affiliation: "Westlake Energy Systems" },
      { name: "Priya Raman", affiliation: "Westlake Energy Systems" },
    ],
  },
  {
    id: "pub-retracted",
    title: "Automated profile scoring from unreconciled citations",
    doi: "10.9999/example.2022.100",
    year: 2022,
    venue: "Synthetic Research Metrics",
    status: "retracted",
    source: "citation-import",
    authors: [
      { name: "Ada Kim", affiliation: "Northbridge Institute" },
      { name: "Omar Singh", affiliation: "Northbridge Institute" },
    ],
  },
];

module.exports = {
  researchers,
  existingClaims,
  importedPublications,
};
