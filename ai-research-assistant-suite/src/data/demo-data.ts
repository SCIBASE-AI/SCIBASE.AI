import type { CorpusPaper, ResearchProject } from "../types.js"

export const projects: ResearchProject[] = [
  {
    id: "project_organoid_response",
    title: "Organoid response markers in inflammatory bowel disease",
    domain: "biology",
    keywords: ["organoid", "single-cell", "inflammation", "therapy response", "RNA-seq"],
    sections: [
      {
        id: "abstract",
        heading: "Abstract",
        text: "We identify a marker panel associated with response in patient-derived organoids. The model reaches 0.82 AUROC on a held-out cohort and suggests epithelial stress pathways as predictors."
      },
      {
        id: "methods",
        heading: "Methods",
        text: "We trained logistic regression and gradient boosted models on single-cell RNA-seq features. We report p-value = 0.03 for the primary endpoint. The split used 70% train and 30% validation."
      },
      {
        id: "results",
        heading: "Results",
        text: "The marker panel improves prediction and supports the claim that epithelial stress signatures are linked to treatment response."
      }
    ],
    artifacts: [
      {
        id: "manuscript_md",
        type: "manuscript",
        path: "manuscript.md",
        content: "Data availability: pending. Ethics approval: IRB-2217."
      },
      {
        id: "analysis_notebook",
        type: "notebook",
        path: "notebooks/analysis.ipynb",
        content: "run: python reproduce.py --seed 42"
      },
      {
        id: "environment",
        type: "environment",
        path: "environment.yml",
        content: "python=3.11\nscikit-learn=1.4\nscanpy=1.10"
      },
      {
        id: "dataset_manifest",
        type: "dataset",
        path: "data/manifest.json",
        content: "{\"rows\": 1200, \"license\": \"controlled-access\"}"
      }
    ]
  },
  {
    id: "project_climate_uncertainty",
    title: "Calibrated uncertainty for regional rainfall forecasts",
    domain: "climate",
    keywords: ["forecasting", "rainfall", "calibration", "uncertainty", "agriculture"],
    sections: [
      {
        id: "abstract",
        heading: "Abstract",
        text: "We evaluate calibrated uncertainty estimates for seasonal rainfall forecasts across smallholder farming regions."
      },
      {
        id: "methods",
        heading: "Methods",
        text: "We compare quantile regression forests, conformal prediction, and baseline climatology. Confidence intervals are reported for every region."
      }
    ],
    artifacts: [
      {
        id: "climate_notebook",
        type: "notebook",
        path: "notebooks/reproduce.ipynb",
        content: "run: python reproduce.py"
      },
      {
        id: "climate_env",
        type: "environment",
        path: "Dockerfile",
        content: "FROM python:3.11-slim"
      }
    ]
  }
]

export const corpus: CorpusPaper[] = [
  {
    id: "paper_ibd_001",
    title: "Single-cell epithelial stress states in inflammatory bowel disease",
    domain: "biology",
    keywords: ["single-cell", "inflammation", "epithelial stress", "IBD"],
    citationCount: 182,
    replicationCount: 2,
    unresolvedQuestions: ["Do organoid response signatures transfer across cohorts?"],
    publishedAt: "2024-02-01"
  },
  {
    id: "paper_organoid_002",
    title: "Patient-derived organoids for therapy response prediction",
    domain: "biology",
    keywords: ["organoid", "therapy response", "biomarker"],
    citationCount: 96,
    replicationCount: 1,
    unresolvedQuestions: ["Which marker panels remain robust under batch effects?"],
    publishedAt: "2023-11-20"
  },
  {
    id: "paper_climate_003",
    title: "Conformal prediction for regional climate services",
    domain: "climate",
    keywords: ["forecasting", "calibration", "uncertainty"],
    citationCount: 64,
    replicationCount: 0,
    unresolvedQuestions: ["How should uncertainty be communicated to agricultural planners?"],
    publishedAt: "2025-01-18"
  },
  {
    id: "paper_ml_004",
    title: "Reproducibility checks for scientific machine learning",
    domain: "machine_learning",
    keywords: ["reproducibility", "model validation", "audit"],
    citationCount: 44,
    replicationCount: 4,
    unresolvedQuestions: ["Can automated checks detect fragile claims before review?"],
    publishedAt: "2025-06-09"
  }
]
