import type { Challenge, ReviewDecision, Submission } from "../types.js"

export const challenges: Challenge[] = [
  {
    id: "challenge_biomarker_rna",
    title: "Identify single-cell RNA biomarkers for therapy response",
    sponsor: "HelixBridge Pharma",
    domain: "biotech",
    visibility: "public",
    phase: "final_review",
    problemStatement: "Find robust biomarkers that predict treatment response from single-cell RNA-seq cohorts.",
    scientificContext: "Sponsors provide anonymized expression matrices, baseline clinical labels, and validation splits.",
    prize: { currency: "USD", cents: 250_000_00 },
    escrowed: { currency: "USD", cents: 250_000_00 },
    timeline: {
      opensAt: "2026-04-01T00:00:00.000Z",
      proposalDueAt: "2026-04-22T00:00:00.000Z",
      finalDueAt: "2026-05-31T00:00:00.000Z"
    },
    ipTerm: "sponsored_transfer_on_payout",
    ndaRequired: true,
    templates: ["biotech-r-and-d", "ml-model", "regulated-data"],
    milestones: [
      {
        id: "proposal",
        title: "Proposal and validation plan",
        dueAt: "2026-04-22T00:00:00.000Z",
        payoutPercent: 10,
        requiredDeliverables: ["problem framing", "analysis plan", "risk register"]
      },
      {
        id: "prototype",
        title: "Prototype model and notebook",
        dueAt: "2026-05-10T00:00:00.000Z",
        payoutPercent: 30,
        requiredDeliverables: ["training notebook", "model card", "intermediate metrics"]
      },
      {
        id: "final",
        title: "Final package",
        dueAt: "2026-05-31T00:00:00.000Z",
        payoutPercent: 60,
        requiredDeliverables: ["model artifact", "whitepaper", "reproducibility manifest"]
      }
    ],
    criteria: [
      {
        id: "scientific_validity",
        label: "Scientific validity",
        description: "Methodology is biologically plausible and statistically defensible.",
        weight: 0.35
      },
      {
        id: "reproducibility",
        label: "Reproducibility",
        description: "Artifacts can be re-run from the submitted manifest.",
        weight: 0.25
      },
      {
        id: "performance",
        label: "Predictive performance",
        description: "Generalizes to held-out validation cohorts.",
        weight: 0.25
      },
      {
        id: "communication",
        label: "Communication",
        description: "Results are clear for sponsor and scientific reviewers.",
        weight: 0.15
      }
    ]
  },
  {
    id: "challenge_climate_forecast",
    title: "Regional climate anomaly forecasting model",
    sponsor: "Open Climate Resilience Fund",
    domain: "climate",
    visibility: "public",
    phase: "open",
    problemStatement: "Forecast seasonal climate anomalies for underserved agricultural regions.",
    scientificContext: "The sponsor prioritizes explainability, calibrated uncertainty, and reproducible open data pipelines.",
    prize: { currency: "USD", cents: 75_000_00 },
    escrowed: { currency: "USD", cents: 75_000_00 },
    timeline: {
      opensAt: "2026-05-01T00:00:00.000Z",
      proposalDueAt: "2026-05-21T00:00:00.000Z",
      finalDueAt: "2026-07-15T00:00:00.000Z"
    },
    ipTerm: "open_source",
    ndaRequired: false,
    templates: ["climate", "forecasting", "open-data"],
    milestones: [
      {
        id: "proposal",
        title: "Proposal",
        dueAt: "2026-05-21T00:00:00.000Z",
        payoutPercent: 20,
        requiredDeliverables: ["data plan", "model architecture", "evaluation plan"]
      },
      {
        id: "final",
        title: "Final model and report",
        dueAt: "2026-07-15T00:00:00.000Z",
        payoutPercent: 80,
        requiredDeliverables: ["forecast model", "calibration report", "deployment notes"]
      }
    ],
    criteria: [
      {
        id: "accuracy",
        label: "Forecast accuracy",
        description: "Improves over sponsor baseline and reports uncertainty.",
        weight: 0.4
      },
      {
        id: "explainability",
        label: "Explainability",
        description: "Outputs can be interpreted by regional partners.",
        weight: 0.25
      },
      {
        id: "reproducibility",
        label: "Reproducibility",
        description: "Pipeline is open and runnable.",
        weight: 0.25
      },
      {
        id: "impact",
        label: "Impact",
        description: "Improves decision support for underserved regions.",
        weight: 0.1
      }
    ]
  }
]

export const submissions: Submission[] = [
  {
    id: "sub_biomarker_atlas",
    challengeId: "challenge_biomarker_rna",
    teamName: "Atlas Biomarker Lab",
    status: "shortlisted",
    submittedAt: "2026-05-08T12:00:00.000Z",
    summary: "Sparse pathway-aware model with cross-cohort validation and SHAP explanations.",
    members: [
      { userId: "user_mina", displayName: "Mina Park", role: "PI", payoutSharePercent: 45 },
      { userId: "user_tomas", displayName: "Tomas Weber", role: "ML engineer", payoutSharePercent: 35 },
      { userId: "user_lena", displayName: "Lena Ortiz", role: "Bioinformatics", payoutSharePercent: 20 }
    ],
    artifacts: [
      {
        id: "art_model",
        type: "model",
        name: "biomarker-model.onnx",
        uri: "s3://scibase-demo/challenge_biomarker_rna/atlas/model.onnx",
        sha256: "bd79f9cde5f6f59a04bd5a2f32fd71246542fb82b3cb41d9a0f19024be041a58",
        reproducibilityCommand: "python notebooks/reproduce.py --manifest manifest.json"
      },
      {
        id: "art_manifest",
        type: "manifest",
        name: "manifest.json",
        uri: "s3://scibase-demo/challenge_biomarker_rna/atlas/manifest.json",
        sha256: "1f8a5b0f7b7280f582ee8d87d7323ac064b70269fdc23595a512035fd89edc88"
      }
    ],
    auditLog: [
      { at: "2026-05-07T09:00:00.000Z", actor: "Mina Park", action: "uploaded validation notebook" },
      { at: "2026-05-08T12:00:00.000Z", actor: "Tomas Weber", action: "submitted final package" }
    ],
    scores: {}
  },
  {
    id: "sub_biomarker_delta",
    challengeId: "challenge_biomarker_rna",
    teamName: "Delta Translational AI",
    status: "submitted",
    submittedAt: "2026-05-08T16:00:00.000Z",
    summary: "Transformer model with strong validation metrics but limited interpretability.",
    members: [
      { userId: "user_ivy", displayName: "Ivy Singh", role: "Lead", payoutSharePercent: 70 },
      { userId: "user_noah", displayName: "Noah Bell", role: "Data science", payoutSharePercent: 30 }
    ],
    artifacts: [
      {
        id: "art_notebook",
        type: "notebook",
        name: "analysis.ipynb",
        uri: "s3://scibase-demo/challenge_biomarker_rna/delta/analysis.ipynb",
        sha256: "5086e478dedab1ea150f28a696564ba8f85944b7df3bf1df83a2f427db3296d6"
      }
    ],
    auditLog: [
      { at: "2026-05-08T16:00:00.000Z", actor: "Ivy Singh", action: "submitted final package" }
    ],
    scores: {}
  }
]

export const reviewDecisions: ReviewDecision[] = [
  {
    submissionId: "sub_biomarker_atlas",
    reviewerId: "reviewer_science_1",
    criterionScores: {
      scientific_validity: 94,
      reproducibility: 92,
      performance: 88,
      communication: 91
    },
    notes: "Strong scientific grounding and complete manifest.",
    recommendedStatus: "winner"
  },
  {
    submissionId: "sub_biomarker_delta",
    reviewerId: "reviewer_science_1",
    criterionScores: {
      scientific_validity: 82,
      reproducibility: 66,
      performance: 93,
      communication: 72
    },
    notes: "Excellent metrics but weaker auditability and interpretability.",
    recommendedStatus: "shortlisted"
  }
]
