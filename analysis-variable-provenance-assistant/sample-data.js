const manuscript = {
  projectId: "SCI-GLUCOSE-17",
  title: "Inflammation and glucose variability in post-acute cohorts",
  domain: "clinical trials",
  analyses: [
    {
      id: "analysis-primary",
      claim: "Inflammation score predicts glucose variability in the post-acute cohort.",
      cohort: "post-acute",
      variables: [
        { name: "inflammation_score", unit: "score", role: "predictor" },
        { name: "glucose_variability", unit: "mg/dL", role: "outcome" },
      ],
      requiredCohortFilter: "post_acute == true",
      reportedTransformHash: "sha256:old-glucose-transform",
    },
    {
      id: "analysis-secondary",
      claim: "Sleep fragmentation explains residual glucose variance.",
      cohort: "sleep-substudy",
      variables: [
        { name: "sleep_fragmentation_index", unit: "index", role: "predictor" },
      ],
      requiredCohortFilter: "sleep_substudy == true",
      reportedTransformHash: "sha256:sleep-transform",
    },
    {
      id: "analysis-sensitivity",
      claim: "Inflammation score remains stable after excluding medication switchers.",
      cohort: "post-acute",
      variables: [
        { name: "inflammation_score", unit: "score", role: "predictor" },
      ],
      requiredCohortFilter: "post_acute == true",
      reportedTransformHash: "sha256:biomarker-transform",
    },
  ],
};

const dataDictionary = {
  variables: [
    {
      id: "inflammation_score",
      aliases: ["inflammation score", "crp_il6_score"],
      unit: "score",
      dataset: "derived_biomarkers.csv",
      lineage: ["crp_mg_l", "il6_pg_ml"],
      allowedCohorts: ["post-acute", "all"],
    },
    {
      id: "glucose_variability",
      aliases: ["glucose variability", "gv"],
      unit: "mmol/L",
      dataset: "wearable_glucose.csv",
      lineage: [],
      allowedCohorts: ["post-acute"],
    },
  ],
};

const pipelines = [
  {
    id: "biomarker-transform",
    outputs: ["inflammation_score"],
    inputs: ["crp_mg_l"],
    cohortFilter: "post_acute == true",
    currentHash: "sha256:biomarker-transform",
    deterministic: true,
    testStatus: "pass",
  },
  {
    id: "glucose-transform",
    outputs: ["glucose_variability"],
    inputs: ["glucose_reading"],
    cohortFilter: "post_acute == true",
    currentHash: "sha256:new-glucose-transform",
    deterministic: false,
    testStatus: "fail",
  },
];

const reproducibilityAttempts = [
  {
    analysisId: "analysis-primary",
    status: "fail",
    reason: "Output variance changed after glucose transform rerun.",
    attemptedAt: "2026-05-18T09:00:00.000Z",
  },
  {
    analysisId: "analysis-sensitivity",
    status: "pass",
    reason: "Sensitivity analysis reproduced from locked transform hash.",
    attemptedAt: "2026-05-19T15:30:00.000Z",
  },
];

module.exports = {
  manuscript,
  dataDictionary,
  pipelines,
  reproducibilityAttempts,
};
