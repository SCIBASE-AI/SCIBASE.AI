export const sampleManuscript = {
  id: "manuscript-organoid-synergy",
  title: "Synergy-aware kinase inhibitor response maps in patient-derived organoids",
  domain: "biology",
  abstract:
    "Patient-derived organoids can preserve tumor heterogeneity, but response maps often ignore drug-combination synergy. We analyzed 30 organoid lines and report that synergy-aware features improve response ranking across held-out cohorts.",
  sections: [
    {
      id: "intro",
      heading: "Introduction",
      text:
        "Patient-derived organoids are increasingly used for translational oncology. Existing response atlases emphasize single-agent potency and often omit drug-combination synergy. Prior single-cell RNA-seq studies show that pathway-state heterogeneity can explain therapy response.",
    },
    {
      id: "methods",
      heading: "Methods",
      text:
        "We profiled 30 organoid lines, measured viability after kinase inhibitor combinations, and fit a synergy-aware ranking model. The analysis notebook uses a fixed seed of 42 and a held-out validation cohort of 8 lines. Raw data and scripts are available in the repository.",
    },
    {
      id: "results",
      heading: "Results",
      text:
        "The baseline single-agent model explained 62% of response variance. Adding synergy_score improved held-out ranking accuracy from 0.71 to 0.79 and identified KRAS-mutant colon organoids as a high-benefit subgroup. Figure 2 reports p=0.04 but omits confidence intervals.",
    },
    {
      id: "ethics",
      heading: "Ethics and data availability",
      text:
        "De-identified organoid data were collected under institutional approval. Data are available under CC-BY-4.0; code is released under Apache-2.0. The manuscript does not yet include a detailed consent statement.",
    },
  ],
  claims: [
    {
      id: "claim-001",
      text: "Synergy-aware features improve held-out ranking accuracy from 0.71 to 0.79.",
      evidenceSection: "results",
      requiredCitationTopics: ["drug synergy", "organoid response prediction"],
    },
    {
      id: "claim-002",
      text: "Single-cell pathway-state heterogeneity can explain therapy response.",
      evidenceSection: "intro",
      requiredCitationTopics: ["single-cell RNA-seq", "therapy response"],
    },
    {
      id: "claim-003",
      text: "Raw data and scripts are available in the repository.",
      evidenceSection: "methods",
      requiredCitationTopics: ["reproducible research"],
    },
  ],
  existingCitations: [
    {
      id: "cite-001",
      title: "Patient-derived organoids in precision oncology",
      authors: ["Drost J", "Clevers H"],
      year: 2018,
      doi: "10.1038/s41586-018-0001",
      topics: ["organoid", "precision oncology"],
    },
    {
      id: "cite-002",
      title: "Single-cell states and drug response",
      authors: ["Kinker GS", "Greenwald AC"],
      year: 2020,
      doi: "10.1038/s41588-020-0002",
      topics: ["single-cell RNA-seq", "therapy response"],
    },
  ],
  candidateCitations: [
    {
      id: "cand-001",
      title: "Drug synergy metrics for translational oncology screens",
      authors: ["Meyer CT", "Wooten DJ"],
      year: 2019,
      doi: "10.1016/j.cell.2019.0003",
      topics: ["drug synergy", "combination therapy", "response prediction"],
      abstract: "Benchmarks Bliss, Loewe, and HSA synergy scoring for cancer drug combinations.",
      openAccess: true,
    },
    {
      id: "cand-002",
      title: "Reproducible computational biology workflows",
      authors: ["Rule A", "Birmingham A"],
      year: 2021,
      doi: "10.1371/journal.pcbi.100042",
      topics: ["reproducible research", "notebooks", "data availability"],
      abstract: "Outlines audit trails, notebooks, raw data, and executable workflow practices.",
      openAccess: true,
    },
    {
      id: "cand-003",
      title: "Organoid response prediction with multi-omic features",
      authors: ["Lee J", "Chen A"],
      year: 2024,
      doi: "10.1101/2024.01.10.0004",
      topics: ["organoid response prediction", "multi-omic", "drug response"],
      abstract: "Uses transcriptomic and pathway features to improve organoid drug response prediction.",
      openAccess: true,
    },
    {
      id: "cand-004",
      title: "Graph neural networks for crystal property prediction",
      authors: ["Xie T", "Grossman JC"],
      year: 2018,
      doi: "10.1103/PhysRevLett.120.145301",
      topics: ["materials science", "graph neural network"],
      abstract: "Predicts material properties from crystal graphs.",
      openAccess: true,
    },
  ],
  openCorpusSnippets: [
    {
      id: "snippet-001",
      source: "open-review-corpus",
      text: "Adding synergy-aware features improved held-out ranking accuracy from 0.70 to 0.78 in organoid drug screens.",
    },
    {
      id: "snippet-002",
      source: "open-methods-corpus",
      text: "The analysis notebook uses a fixed random seed and reports validation cohort performance with confidence intervals.",
    },
  ],
};
