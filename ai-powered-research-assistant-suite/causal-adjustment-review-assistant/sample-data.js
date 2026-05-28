const samplePacket = {
  studyId: "obs-therapy-mortality-2026",
  title: "Observational Therapy Mortality Manuscript",
  studyDesign: {
    type: "observational_cohort",
    dataSource: "synthetic multi-site registry",
    estimand: "total effect of early immunotherapy on 90-day mortality",
  },
  variables: [
    { id: "early-immunotherapy", label: "Early immunotherapy", role: "exposure" },
    { id: "mortality-90d", label: "90-day mortality", role: "outcome" },
    { id: "baseline-severity", label: "Baseline disease severity", role: "confounder" },
    { id: "age", label: "Age", role: "confounder" },
    { id: "comorbidity-index", label: "Comorbidity index", role: "confounder" },
    {
      id: "hospitalization",
      label: "Hospitalization after treatment decision",
      role: "collider",
      rationale: "affected by treatment access and early clinical decline",
      measuredAfterExposure: true,
    },
    {
      id: "biomarker-response",
      label: "Early biomarker response",
      role: "mediator",
      measuredAfterExposure: true,
    },
    { id: "site-region", label: "Site region", role: "effect-modifier" },
    { id: "clinic-preference", label: "Clinic preference score", role: "candidate-instrument" },
  ],
  causalGraph: {
    exposureId: "early-immunotherapy",
    outcomeId: "mortality-90d",
    requiredConfounders: ["baseline-severity", "age", "comorbidity-index"],
    edges: [
      ["baseline-severity", "early-immunotherapy"],
      ["baseline-severity", "mortality-90d"],
      ["age", "early-immunotherapy"],
      ["age", "mortality-90d"],
      ["comorbidity-index", "early-immunotherapy"],
      ["comorbidity-index", "mortality-90d"],
      ["early-immunotherapy", "biomarker-response"],
      ["biomarker-response", "mortality-90d"],
      ["early-immunotherapy", "hospitalization"],
      ["mortality-90d", "hospitalization"],
    ],
  },
  analysisPlan: {
    model: "weighted Cox model",
    adjustedCovariates: ["age", "hospitalization", "biomarker-response", "clinic-preference"],
    reportedStrata: [],
  },
  claims: [
    {
      id: "claim-primary-causal",
      type: "causal",
      text: "Early immunotherapy reduced 90-day mortality across the registry cohort.",
      evidenceIds: ["table-2", "figure-3"],
    },
    {
      id: "claim-mechanism",
      type: "causal",
      text: "The therapy prevents death by rapidly improving inflammatory biomarkers.",
      evidenceIds: ["figure-4"],
    },
  ],
  temporalChecks: [
    {
      id: "baseline-severity-before-exposure",
      passes: true,
      expected: "severity measured before first treatment decision",
      observed: "severity measured at registry intake",
    },
    {
      id: "hospitalization-before-exposure",
      passes: false,
      expected: "all adjusted covariates measured before exposure",
      observed: "hospitalization is recorded after treatment decision for 38% of rows",
      affectedClaimIds: ["claim-primary-causal"],
    },
  ],
  diagnostics: {
    minPropensity: 0.02,
    maxPropensity: 0.98,
    balance: [
      { variableId: "baseline-severity", standardizedMeanDifference: 0.42 },
      { variableId: "comorbidity-index", standardizedMeanDifference: 0.31 },
      { variableId: "age", standardizedMeanDifference: 0.11 },
    ],
    negativeControls: [
      {
        id: "negative-control-dental-visit",
        expectedNull: true,
        effectEstimate: -0.18,
        tolerance: 0.05,
        pValue: 0.012,
      },
    ],
  },
  instrumentChecks: [
    {
      variableId: "clinic-preference",
      relevanceSupported: true,
      exclusionRestrictionSupported: false,
      concern: "clinic preference is associated with severity referral pathways",
    },
  ],
  effectModifiers: [
    {
      variableId: "site-region",
      required: true,
      reason: "treatment access and mortality baseline vary across regions",
    },
  ],
};

module.exports = { samplePacket };
