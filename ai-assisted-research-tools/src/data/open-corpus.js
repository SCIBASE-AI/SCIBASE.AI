export const corpus = [
  {
    id: "pubmed-organoid-dose-response",
    title: "Dose response profiling in patient-derived tumor organoids",
    authors: ["M. Alvarez", "N. Chen", "R. Singh"],
    year: 2024,
    venue: "Nature Cancer Methods",
    doi: "10.1038/ncm.2024.118",
    domains: ["oncology", "organoids", "dose response", "biomarkers"],
    abstract:
      "Patient-derived tumor organoids preserve clinically meaningful treatment response signals when dose response curves are paired with genomic covariates and negative controls.",
    citedBy: 148
  },
  {
    id: "arxiv-reproducible-ml-biology",
    title: "Reproducible machine learning workflows for biological discovery",
    authors: ["E. Navarro", "P. Gupta"],
    year: 2023,
    venue: "arXiv",
    doi: "10.48550/arXiv.2307.10444",
    domains: ["machine learning", "reproducibility", "biology", "pipelines"],
    abstract:
      "Reproducibility improves when biological machine learning manuscripts publish pinned environments, deterministic splits, evaluation scripts, and raw data provenance.",
    citedBy: 92
  },
  {
    id: "pubmed-statistical-reporting",
    title: "Common statistical reporting errors in preclinical manuscripts",
    authors: ["L. Hart", "S. Okafor", "Y. Ito"],
    year: 2022,
    venue: "Journal of Clinical Research Integrity",
    doi: "10.1016/j.jcri.2022.04.013",
    domains: ["statistics", "peer review", "p values", "confidence intervals"],
    abstract:
      "Frequent reporting defects include isolated p-values without effect sizes, missing confidence intervals, unclear multiple testing correction, and underpowered subgroup claims.",
    citedBy: 211
  },
  {
    id: "semantic-open-citation-review",
    title: "Context aware citation recommendation for scientific writing",
    authors: ["A. Mercer", "T. Bello"],
    year: 2025,
    venue: "Semantic Scholar Open Research",
    doi: "10.5555/ssor.2025.019",
    domains: ["citations", "retrieval", "scientific writing", "recommendation"],
    abstract:
      "Citation recommenders perform best when retrieval combines local manuscript context, domain keywords, citation graph proximity, and recency-aware reranking.",
    citedBy: 37
  },
  {
    id: "bioethics-data-availability",
    title: "Ethics and data availability statements in biomedical publication",
    authors: ["J. Wallace", "I. Rahman", "K. Li"],
    year: 2021,
    venue: "PLOS Biology Policy",
    doi: "10.1371/pbio.2021.771",
    domains: ["ethics", "data availability", "biomedical", "compliance"],
    abstract:
      "Biomedical reviewers should verify ethics approval, consent language, repository accessions, and data availability statements before manuscript submission.",
    citedBy: 309
  },
  {
    id: "nature-lay-summary",
    title: "Readable lay summaries increase public reuse of research outputs",
    authors: ["D. Morgan", "C. Evans"],
    year: 2020,
    venue: "Nature Human Behaviour",
    doi: "10.1038/nhb.2020.44",
    domains: ["lay summaries", "science communication", "public engagement"],
    abstract:
      "Research summaries written with concrete language and explicit practical implications improve comprehension among non-specialist audiences without reducing scientific accuracy.",
    citedBy: 186
  }
];

export const reviewTemplates = {
  biology: {
    requiredStatements: ["ethics", "data availability", "consent"],
    statisticalFocus: ["sample size", "confidence interval", "multiple testing"],
    tone: "evidence-calibrated and reproducibility-focused"
  },
  physics: {
    requiredStatements: ["uncertainty", "calibration", "data availability"],
    statisticalFocus: ["error bars", "baseline", "replication"],
    tone: "methodological and assumption-explicit"
  },
  "social-science": {
    requiredStatements: ["ethics", "consent", "limitations"],
    statisticalFocus: ["effect size", "confidence interval", "power"],
    tone: "bias-aware and methods-forward"
  }
};

export const manuscript = {
  id: "project-organoid-response",
  title: "Predicting chemotherapy response from patient-derived organoid growth curves",
  domain: "biology",
  highlightedText:
    "Dose response profiling in organoids can predict tumor sensitivity when paired with genomic biomarkers and reproducible analysis scripts.",
  sections: [
    {
      heading: "Abstract",
      text:
        "Patient-derived tumor organoids are a promising model for evaluating therapy sensitivity. We trained a machine learning model on growth-curve features and genomic biomarkers to predict chemotherapy response. The study reports p = 0.04 for the main endpoint and a validation accuracy of 0.82 across two hospital cohorts."
    },
    {
      heading: "Methods",
      text:
        "Organoids were cultured from 86 consented patients. Growth curves were normalized against vehicle controls, then evaluated with a random forest classifier. Code and de-identified features are available in a public repository. The analysis used a fixed random seed and a held-out validation split."
    },
    {
      heading: "Results",
      text:
        "The model improved response prediction compared with baseline clinical staging. Resistant tumors showed flatter dose response curves and distinct pathway activity. Confidence intervals were not reported for subgroup comparisons, and multiple testing correction was not described."
    },
    {
      heading: "Discussion",
      text:
        "These findings suggest organoid assays may guide treatment selection. Future studies should include prospective replication, larger sample sizes, and stronger reporting of uncertainty."
    }
  ],
  existingReferences: ["pubmed-statistical-reporting"],
  uploadedCorpusSnippets: [
    "Organoid dose response curves preserve clinically meaningful treatment response signals when paired with genomic covariates.",
    "Biomedical reviewers should verify ethics approval, consent language, repository accessions, and data availability statements before submission."
  ]
};
