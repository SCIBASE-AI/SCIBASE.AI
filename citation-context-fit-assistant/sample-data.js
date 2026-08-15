const project = {
  asOfDate: "2026-05-22",
  policy: {
    minimumSupportStrength: 0.72,
    staleEvidenceYears: 8,
    minimumFieldOverlap: 0.45,
    insertionRequiresIntent: true,
    allowContradictoryOnlyWithNote: true
  },
  manuscript: {
    id: "ms-ai-citation-013",
    title: "Synthetic Microbiome Intervention Review",
    highlightedClaims: [
      {
        id: "claim-001",
        text: "Short-course prebiotic treatment improves alpha diversity within two weeks.",
        field: "microbiome",
        claimType: "causal",
        polarity: "positive",
        intendedCitationRole: "direct-support"
      },
      {
        id: "claim-002",
        text: "The workflow generalizes across pediatric and geriatric cohorts.",
        field: "clinical-microbiome",
        claimType: "generalization",
        polarity: "positive",
        intendedCitationRole: "direct-support"
      },
      {
        id: "claim-003",
        text: "Older metagenomic pipelines remain useful as historical baselines.",
        field: "metagenomics",
        claimType: "background",
        polarity: "neutral",
        intendedCitationRole: "background"
      }
    ]
  },
  candidates: [
    {
      id: "cand-001",
      claimId: "claim-001",
      title: "Prebiotic Intervention Effects in Synthetic Adult Cohorts",
      year: 2024,
      field: "microbiome",
      citationIntent: "direct-support",
      relation: "supports",
      evidenceStrength: 0.86,
      fieldOverlap: 0.91,
      polarity: "positive",
      insertionNote: "Supports two-week alpha-diversity improvement in adult cohorts."
    },
    {
      id: "cand-002",
      claimId: "claim-002",
      title: "Pediatric Microbiome Response Limits",
      year: 2021,
      field: "clinical-microbiome",
      citationIntent: "direct-support",
      relation: "contradicts",
      evidenceStrength: 0.81,
      fieldOverlap: 0.74,
      polarity: "negative",
      insertionNote: ""
    },
    {
      id: "cand-003",
      claimId: "claim-003",
      title: "Early Metagenomic Pipeline Benchmarks",
      year: 2012,
      field: "metagenomics",
      citationIntent: "background",
      relation: "contextualizes",
      evidenceStrength: 0.64,
      fieldOverlap: 0.67,
      polarity: "neutral",
      insertionNote: "Historical baseline only."
    },
    {
      id: "cand-004",
      claimId: "claim-001",
      title: "Soil Microbial Bioreactor Survey",
      year: 2025,
      field: "environmental-microbiology",
      citationIntent: "direct-support",
      relation: "irrelevant",
      evidenceStrength: 0.3,
      fieldOverlap: 0.18,
      polarity: "neutral",
      insertionNote: "Related organism methods."
    }
  ]
};

module.exports = { project };
