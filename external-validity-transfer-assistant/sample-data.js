const project = {
  id: "project-transfer-001",
  title: "Portable biomarker triage assistant for multi-site oncology cohorts",
  domain: "clinical-ai",
  labCapabilities: ["rna-seq", "clinical-metadata", "containerized-python", "external-cohort-review"],
  manuscript: {
    title: "A generalizable biomarker triage model for oncology screening",
    targetUse: "pre-submission peer review",
    claims: [
      {
        id: "claim-generalizable-oncology",
        text: "The model generalizes across oncology patient populations and hospital settings.",
        assertedScope: {
          populations: ["adult", "pediatric", "underrepresented ancestry"],
          settings: ["academic hospital", "community hospital", "international site"],
          instruments: ["bulk-rna-seq", "single-cell-rna-seq"],
          environments: ["python-3.11", "cuda", "cpu-only"]
        },
        evidenceIds: ["internal-adult-cohort", "academic-hospital-runbook"],
        confidence: "strong"
      },
      {
        id: "claim-reproducible-pipeline",
        text: "The manuscript includes enough artifacts for an independent lab to rerun the triage pipeline.",
        assertedScope: {
          populations: ["adult"],
          settings: ["academic hospital"],
          instruments: ["bulk-rna-seq"],
          environments: ["python-3.11"]
        },
        evidenceIds: ["container-runbook", "clean-data-manifest", "external-adult-validation"],
        confidence: "moderate"
      },
      {
        id: "claim-deployment-ready",
        text: "The assistant is ready for deployment guidance in low-resource clinics.",
        assertedScope: {
          populations: ["adult"],
          settings: ["low-resource clinic", "community hospital"],
          instruments: ["bulk-rna-seq"],
          environments: ["cpu-only"]
        },
        evidenceIds: ["community-hospital-protocol"],
        confidence: "strong"
      }
    ],
    requiredSubgroups: ["adult", "pediatric", "underrepresented ancestry"],
    declaredLimitations: [
      "The pilot cohort is single-country.",
      "No pediatric external cohort is currently available."
    ]
  },
  evidence: [
    {
      id: "internal-adult-cohort",
      type: "internal-cohort",
      population: "adult",
      setting: "academic hospital",
      instrument: "bulk-rna-seq",
      environment: "python-3.11",
      sampleSize: 820,
      reproducible: true,
      externalValidation: false,
      limitations: ["single-country", "academic-site-only"]
    },
    {
      id: "academic-hospital-runbook",
      type: "runbook",
      population: "adult",
      setting: "academic hospital",
      instrument: "bulk-rna-seq",
      environment: "python-3.11",
      sampleSize: 0,
      reproducible: true,
      externalValidation: false,
      limitations: ["no-community-site-smoke-test"]
    },
    {
      id: "container-runbook",
      type: "runtime-evidence",
      population: "adult",
      setting: "academic hospital",
      instrument: "bulk-rna-seq",
      environment: "python-3.11",
      sampleSize: 0,
      reproducible: true,
      externalValidation: false,
      limitations: []
    },
    {
      id: "clean-data-manifest",
      type: "artifact-manifest",
      population: "adult",
      setting: "academic hospital",
      instrument: "bulk-rna-seq",
      environment: "python-3.11",
      sampleSize: 820,
      reproducible: true,
      externalValidation: false,
      limitations: []
    },
    {
      id: "external-adult-validation",
      type: "external-validation",
      population: "adult",
      setting: "community hospital",
      instrument: "bulk-rna-seq",
      environment: "python-3.11",
      sampleSize: 290,
      reproducible: true,
      externalValidation: true,
      limitations: ["adult-only"]
    },
    {
      id: "community-hospital-protocol",
      type: "protocol",
      population: "adult",
      setting: "community hospital",
      instrument: "bulk-rna-seq",
      environment: "cpu-only",
      sampleSize: 0,
      reproducible: false,
      externalValidation: false,
      limitations: ["protocol-only", "no-completed-run"]
    }
  ],
  corpusSignals: [
    {
      id: "gap-pediatric-oncology-rnaseq",
      topic: "pediatric oncology RNA-seq validation",
      reason: "frequently cited limitation with low replication coverage",
      labFit: ["rna-seq", "external-cohort-review"]
    },
    {
      id: "gap-cpu-only-clinic-run",
      topic: "CPU-only low-resource clinic reproducibility run",
      reason: "deployment claim depends on clinic-like runtime evidence",
      labFit: ["containerized-python"]
    },
    {
      id: "gap-ancestry-balanced-evaluation",
      topic: "ancestry-balanced external validation",
      reason: "underrepresented ancestry is asserted but not evidenced",
      labFit: ["clinical-metadata", "external-cohort-review"]
    }
  ]
};

module.exports = { project };
