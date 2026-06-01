const cleanPacket = {
  manuscriptId: "astrocyte-calcium-preprint-v3",
  terms: [
    {
      id: "term-gcamp",
      label: "genetically encoded calcium indicator",
      short: "GECI",
      expansion: "genetically encoded calcium indicator",
      firstUseSection: "abstract",
      expandedAtFirstUse: true,
      requiresDefinition: true,
      definition: "A fluorescent protein sensor used to report intracellular calcium dynamics.",
      layDefinition: "A lab-made sensor that glows when cell calcium changes.",
      jargonLevel: "medium",
      observedForms: ["genetically encoded calcium indicator", "GECI"],
      preferredForm: "genetically encoded calcium indicator"
    },
    {
      id: "term-gfap",
      label: "glial fibrillary acidic protein",
      short: "GFAP",
      expansion: "glial fibrillary acidic protein",
      firstUseSection: "methods",
      expandedAtFirstUse: true,
      requiresDefinition: true,
      definition: "An astrocyte marker used to identify glial cells in the imaging cohort.",
      layDefinition: "A marker that helps identify support cells in the brain.",
      jargonLevel: "medium",
      observedForms: ["glial fibrillary acidic protein", "GFAP"],
      preferredForm: "glial fibrillary acidic protein"
    },
    {
      id: "term-stat-model",
      label: "mixed-effects model",
      firstUseSection: "results",
      expandedAtFirstUse: true,
      requiresDefinition: true,
      definition: "A statistical model that accounts for repeated observations from the same animal.",
      layDefinition: "A model that avoids counting repeated measurements as unrelated.",
      jargonLevel: "medium",
      observedForms: ["mixed-effects model"],
      preferredForm: "mixed-effects model"
    }
  ],
  citationRecommendations: [
    {
      id: "cite-geci-method",
      termId: "term-gcamp",
      reason: "Supports calcium indicator methodology."
    }
  ],
  generatedSummaries: [
    {
      id: "summary-lay",
      mode: "layperson",
      termIds: ["term-gcamp", "term-stat-model"]
    }
  ]
};

const riskyPacket = {
  manuscriptId: "oncology-organoid-draft-v1",
  terms: [
    {
      id: "term-pdx-a",
      label: "patient-derived xenograft",
      short: "PDX",
      expansion: "patient-derived xenograft",
      firstUseSection: "abstract",
      expandedAtFirstUse: false,
      requiresDefinition: true,
      definition: "",
      jargonLevel: "high",
      observedForms: ["PDX", "patient derived xenograft"],
      preferredForm: "patient-derived xenograft",
      audience: "expert"
    },
    {
      id: "term-pdx-b",
      label: "pharmacodynamic index",
      short: "PDX",
      expansion: "pharmacodynamic index",
      firstUseSection: "results",
      expandedAtFirstUse: true,
      requiresDefinition: true,
      definition: "A composite drug-response index used in the exploratory analysis.",
      jargonLevel: "high",
      observedForms: ["PDX", "pharmacodynamic index"],
      preferredForm: "pharmacodynamic index"
    },
    {
      id: "term-erbb2",
      label: "ERBB2",
      firstUseSection: "title",
      expandedAtFirstUse: true,
      requiresDefinition: true,
      definition: "",
      jargonLevel: "high",
      expectedStyle: "HGNC gene symbol",
      observedStyle: "protein alias",
      observedForms: ["HER2", "ERBB2-positive", "Her-2"],
      preferredForm: "ERBB2"
    },
    {
      id: "term-organoid",
      label: "organoid viability score",
      firstUseSection: "lay_summary",
      expandedAtFirstUse: true,
      requiresDefinition: true,
      definition: "A normalized assay readout for live tumor organoid cells after treatment.",
      jargonLevel: "high",
      audience: "lay",
      observedForms: ["organoid viability score", "OVS"],
      preferredForm: "organoid viability score"
    }
  ],
  citationRecommendations: [
    {
      id: "cite-pdx-model",
      termId: "term-pdx-a",
      reason: "Recommended for first use of PDX model."
    },
    {
      id: "cite-unknown",
      termId: "term-nonexistent",
      reason: "Unbound recommendation from retrieval layer."
    }
  ],
  generatedSummaries: [
    {
      id: "summary-lay",
      mode: "layperson",
      termIds: ["term-pdx-a", "term-organoid"]
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
