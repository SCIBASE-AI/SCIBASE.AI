export const sampleChallenges = [
  {
    id: "challenge-biomarker-rna",
    title: "Identify therapy-response biomarkers from single-cell RNA-seq",
    sponsor: {
      id: "sponsor-pharma-a",
      name: "Pharma A translational research",
      type: "industry",
      verified: true,
      billingReady: true,
    },
    vertical: "biotech",
    visibility: "private",
    problem: {
      summary: "Find reproducible single-cell RNA-seq biomarkers associated with therapy response.",
      scientificContext:
        "The sponsor provides anonymized single-cell transcriptomics from responders and non-responders across three cohorts.",
      targetOutcome: "Ranked biomarker panel with validation notebook and assay rationale.",
    },
    deliverables: [
      { id: "d1", type: "notebook", title: "Reproducible analysis notebook", required: true },
      { id: "d2", type: "dataset", title: "Normalized feature matrix and metadata", required: true },
      { id: "d3", type: "whitepaper", title: "Biomarker rationale and assay design", required: true },
    ],
    rubric: [
      { criterion: "Reproducibility", weight: 30, description: "Notebook reruns from raw inputs to final ranking." },
      { criterion: "Biological plausibility", weight: 25, description: "Findings map to known immune pathways." },
      { criterion: "Predictive performance", weight: 25, description: "Panel validates across held-out cohorts." },
      { criterion: "Clinical feasibility", weight: 20, description: "Assay design is realistic for follow-up." },
    ],
    milestones: [
      { id: "proposal", dueOffsetDays: 14, payoutPercent: 15, requiredArtifacts: ["summary", "team-profile"] },
      { id: "prototype", dueOffsetDays: 45, payoutPercent: 35, requiredArtifacts: ["notebook", "interim-report"] },
      { id: "final", dueOffsetDays: 90, payoutPercent: 50, requiredArtifacts: ["notebook", "dataset", "whitepaper"] },
    ],
    prize: {
      totalCents: 5000000,
      currency: "USD",
      escrowRequired: true,
      escrowStatus: "funded",
      honorableMentionCents: 250000,
    },
    nda: {
      required: true,
      templateId: "nda-biotech-sensitive-data-v2",
      reviewerAccess: "sponsor-and-approved-reviewers",
      dataRoomRequired: true,
    },
    prequalification: {
      enabled: true,
      requiredSignals: ["orcid", "institution", "domain-experience", "conflict-disclosure"],
      maxTeams: 8,
      blindReview: true,
    },
    ipPolicy: {
      mode: "sponsored-transfer-on-payout",
      licenseFallback: "research-use-only",
      solverRetainsIpUntilPaid: true,
      openSourceAfterEmbargoDays: null,
    },
    timeline: {
      opensAt: "2026-06-01T00:00:00.000Z",
      closesAt: "2026-09-01T00:00:00.000Z",
    },
  },
  {
    id: "challenge-climate-forecast",
    title: "Improve regional rainfall forecast calibration",
    sponsor: {
      id: "sponsor-climate-nonprofit",
      name: "Open Climate Resilience Fund",
      type: "nonprofit",
      verified: true,
      billingReady: false,
    },
    vertical: "climate",
    visibility: "public",
    problem: {
      summary: "Improve calibration for regional rainfall forecasts in coastal cities.",
      scientificContext: "",
      targetOutcome: "Calibration model and evaluation report.",
    },
    deliverables: [
      { id: "d1", type: "model", title: "Forecast calibration model", required: true },
      { id: "d2", type: "report", title: "Evaluation report", required: true },
    ],
    rubric: [
      { criterion: "Forecast accuracy", weight: 60, description: "Improves Brier score against baseline." },
      { criterion: "Deployment simplicity", weight: 30, description: "Runs in constrained municipal settings." },
    ],
    milestones: [
      { id: "final", dueOffsetDays: 60, payoutPercent: 100, requiredArtifacts: ["model", "report"] },
    ],
    prize: {
      totalCents: 1500000,
      currency: "USD",
      escrowRequired: true,
      escrowStatus: "pending",
      honorableMentionCents: 0,
    },
    nda: {
      required: false,
      templateId: null,
      reviewerAccess: "public",
      dataRoomRequired: false,
    },
    prequalification: {
      enabled: false,
      requiredSignals: [],
      maxTeams: null,
      blindReview: false,
    },
    ipPolicy: {
      mode: "open",
      licenseFallback: "apache-2.0",
      solverRetainsIpUntilPaid: true,
      openSourceAfterEmbargoDays: 0,
    },
    timeline: {
      opensAt: "2026-06-15T00:00:00.000Z",
      closesAt: "2026-08-15T00:00:00.000Z",
    },
  },
];

export const sampleParticipantApplications = [
  {
    id: "app-immune-lab",
    challengeId: "challenge-biomarker-rna",
    teamName: "Immune Systems Lab",
    applicantIds: ["orcid:0000-0002-1825-0097", "github:singlecell-engineer"],
    signals: {
      orcid: true,
      institution: true,
      domainExperience: ["single-cell-rna", "biomarkers", "clinical-validation"],
      conflictDisclosure: true,
      ndaSigned: true,
      priorBountyCompletions: 2,
    },
  },
  {
    id: "app-ml-students",
    challengeId: "challenge-biomarker-rna",
    teamName: "General ML Students",
    applicantIds: ["github:student-team"],
    signals: {
      orcid: false,
      institution: false,
      domainExperience: ["kaggle", "tabular-ml"],
      conflictDisclosure: false,
      ndaSigned: false,
      priorBountyCompletions: 0,
    },
  },
];
