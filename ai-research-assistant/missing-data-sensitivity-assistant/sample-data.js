const highRiskStudy = {
  id: "trial-mda-001",
  title: "Digital biomarker therapy trial with incomplete twelve-week outcomes",
  arms: [
    { name: "Control", randomized: 120, analyzed: 110 },
    { name: "Intervention", randomized: 118, analyzed: 84 },
  ],
  variables: [
    {
      name: "week12-functional-score",
      role: "primary-outcome",
      missingByArm: {
        Control: 10,
        Intervention: 34,
      },
    },
    {
      name: "baseline-severity",
      role: "covariate",
      missingByArm: {
        Control: 2,
        Intervention: 3,
      },
    },
  ],
  analysisPlan: {
    estimand: "treatment-policy",
    missingDataPlan: "",
    imputation: {
      method: "single mean imputation",
      diagnostics: [],
    },
    sensitivityAnalyses: ["complete-case comparison"],
  },
  missingnessEvidence: [
    {
      variable: "week12-functional-score",
      signal: "outcome-related",
      detail: "intervention dropouts had worse week-four scores and more adverse-event discontinuations",
    },
  ],
  effectEstimates: {
    completeCase: { estimate: 0.42, ci: [0.18, 0.66] },
    imputed: { estimate: 0.21, ci: [-0.03, 0.45] },
    sensitivityWorst: {
      supportsClaim: false,
      summary: "delta-adjusted scenario reduces the effect to 0.05 and crosses the null threshold",
    },
  },
  dropoutReasons: [
    { reason: "adverse event", count: 16 },
    { reason: "unknown", count: 18 },
    { reason: "moved away", count: 4 },
    { reason: "not reported", count: 6 },
  ],
  claims: [
    {
      id: "claim-primary-efficacy",
      text: "The intervention conclusively improves twelve-week functional recovery.",
      usesCompleteCaseOnly: true,
    },
  ],
};

const lowRiskStudy = {
  id: "cohort-mda-002",
  title: "Open notebook reproducibility cohort with planned missingness sensitivity",
  arms: [
    { name: "Reference", randomized: 90, analyzed: 86 },
    { name: "Replication", randomized: 92, analyzed: 88 },
  ],
  variables: [
    {
      name: "notebook-rerun-score",
      role: "primary-outcome",
      missingByArm: {
        Reference: 4,
        Replication: 4,
      },
    },
  ],
  analysisPlan: {
    estimand: "hypothetical",
    missingDataPlan: "multiple imputation with prespecified covariates and transparent sensitivity checks",
    imputation: {
      method: "multiple imputation with predictive mean matching",
      diagnostics: ["trace convergence", "posterior predictive check", "fraction missing information"],
    },
    sensitivityAnalyses: ["delta-adjusted MNAR tipping point", "complete-case comparison"],
  },
  missingnessEvidence: [],
  effectEstimates: {
    completeCase: { estimate: 0.18, ci: [0.05, 0.31] },
    imputed: { estimate: 0.17, ci: [0.04, 0.3] },
    sensitivityWorst: {
      supportsClaim: true,
      summary: "tipping point remains directionally consistent through the prespecified plausible delta range",
    },
  },
  dropoutReasons: [
    { reason: "schedule conflict", count: 4 },
    { reason: "technical upload issue", count: 3 },
    { reason: "unknown", count: 1 },
  ],
  claims: [
    {
      id: "claim-replication",
      text: "Replication notebooks show a modest and sensitivity-tested improvement.",
      usesCompleteCaseOnly: false,
    },
  ],
};

module.exports = {
  highRiskStudy,
  lowRiskStudy,
};
