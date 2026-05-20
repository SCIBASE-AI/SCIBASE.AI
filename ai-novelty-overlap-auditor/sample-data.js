"use strict";

const manuscript = {
  id: "ms-alpha-042",
  title: "Federated CRISPR Screen Prioritization With Privacy-Preserving Lab Signals",
  domain: "computational biology",
  abstract:
    "We introduce a federated workflow for ranking CRISPR perturbation targets across labs without sharing raw read-count matrices.",
  sections: [
    {
      id: "claim-1",
      text:
        "This is the first federated CRISPR prioritization method that combines encrypted read-count signals with lab-level reproducibility scores.",
      location: "Abstract",
      evidenceRefs: ["fig-1", "table-2"],
      citations: ["lee-2024-secure-screen"],
      contributionType: "method"
    },
    {
      id: "claim-2",
      text:
        "The ranking model remains stable when one collaborating lab has a 20 percent dropout rate in guide-level observations.",
      location: "Results",
      evidenceRefs: ["fig-3", "notebook-stability"],
      citations: ["nguyen-2025-dropout"],
      contributionType: "evaluation"
    },
    {
      id: "claim-3",
      text:
        "Our assistant uses federated omics model-card evidence packets for cross-institutional audits, suggests adjacent papers, and rewrites overbroad novelty language before peer review.",
      location: "Discussion",
      evidenceRefs: ["appendix-audit"],
      citations: [],
      contributionType: "workflow"
    }
  ]
};

const adjacentWorks = [
  {
    id: "lee-2024-secure-screen",
    title: "Secure Aggregation for Multi-Lab CRISPR Screen Ranking",
    year: 2024,
    doi: "10.5555/secure-crispr.2024.018",
    sourceUrl: "https://example.org/secure-crispr-ranking",
    topics: ["CRISPR", "federated", "secure aggregation", "read-count", "ranking"],
    methods: ["encrypted aggregation", "lab reproducibility score"],
    findings: [
      "combines encrypted read-count signals across labs",
      "ranks perturbation targets with lab-level reproducibility weighting"
    ],
    sourceStatus: "active"
  },
  {
    id: "nguyen-2025-dropout",
    title: "Dropout-Robust Guide Ranking in Distributed Perturbation Screens",
    year: 2025,
    doi: "10.5555/dropout-guide-ranking.2025.004",
    sourceUrl: "https://example.org/dropout-guide-ranking",
    topics: ["CRISPR", "dropout", "guide-level", "ranking", "distributed"],
    methods: ["missingness simulation", "rank stability"],
    findings: [
      "quantifies guide-level dropout effects",
      "reports stability thresholds for multi-site perturbation ranking"
    ],
    sourceStatus: "active"
  },
  {
    id: "park-2023-federated-omics",
    title: "Federated Omics Model Cards for Cross-Institutional Studies",
    year: 2023,
    doi: "10.5555/federated-omics-cards.2023.022",
    sourceUrl: "https://example.org/federated-omics-cards",
    topics: ["federated", "omics", "model card", "institutional", "audit"],
    methods: ["model cards", "evidence packet"],
    findings: [
      "uses model cards for cross-institutional omics audits",
      "requires adjacent-work citation checks before release"
    ],
    sourceStatus: "active"
  },
  {
    id: "retracted-2022-crispr-priority",
    title: "Universal CRISPR Target Prioritization With Private Lab Embeddings",
    year: 2022,
    doi: "10.5555/retracted-crispr.2022.009",
    sourceUrl: "https://example.org/retracted-crispr-priority",
    topics: ["CRISPR", "private embeddings", "target prioritization"],
    methods: ["private lab embeddings"],
    findings: ["claimed universal CRISPR target prioritization across labs"],
    sourceStatus: "retracted",
    statusReason: "publisher expression of concern escalated to retraction"
  }
];

module.exports = {
  manuscript,
  adjacentWorks
};
