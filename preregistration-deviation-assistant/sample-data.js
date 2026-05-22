const readyPacket = {
  registration: {
    id: "OSF-READY-042",
    registry: "OSF",
    registeredAt: "2026-01-10",
    dataCollectionStartedAt: "2026-01-15",
    primaryOutcomes: ["mean change in reproducibility score"],
    secondaryOutcomes: ["review completion time", "author revision acceptance"],
    analysisPlan: {
      model: "linear mixed effects",
      covariates: ["field", "career stage"],
      subgroups: ["life sciences", "physical sciences"],
      requiresMultipleTestingCorrection: true,
    },
    samplePlan: {
      targetN: 240,
      exclusionCriteria: ["incomplete manuscript", "duplicate submission"],
    },
    amendments: [],
  },
  manuscript: {
    id: "MS-READY-042",
    title: "AI-assisted review feedback improves reproducibility reporting",
    submittedAt: "2026-05-15",
    dataCollectionStartedAt: "2026-01-15",
    unblindedAt: "2026-04-30",
    primaryOutcomes: ["mean change in reproducibility score"],
    secondaryOutcomes: ["review completion time", "author revision acceptance"],
    analysisPlan: {
      model: "linear mixed effects",
      covariates: ["field", "career stage"],
      subgroups: ["life sciences", "physical sciences"],
      multipleTestingCorrection: true,
    },
    samplePlan: {
      analyzedN: 236,
      exclusionCriteria: ["incomplete manuscript", "duplicate submission"],
    },
    claims: {
      exploratoryFindings: ["editor seniority interaction"],
      exploratoryLabelingComplete: true,
      subgroupsPresentedAsConfirmatory: false,
    },
  },
};

const reviewPacket = {
  registration: {
    id: "OSF-REVIEW-118",
    registry: "OSF",
    registeredAt: "2026-02-01",
    dataCollectionStartedAt: "2026-02-08",
    primaryOutcomes: ["validated citation coverage"],
    secondaryOutcomes: ["reviewer time saved", "missed limitation count"],
    analysisPlan: {
      model: "negative binomial regression",
      covariates: ["domain"],
      subgroups: ["clinical trials"],
      requiresMultipleTestingCorrection: false,
    },
    samplePlan: {
      targetN: 180,
      exclusionCriteria: ["non-english manuscript"],
    },
    amendments: [
      {
        id: "AMD-2",
        type: "sample-size",
        date: "2026-03-12",
        prospective: true,
        reason: "Recruitment rate update before analysis.",
      },
      {
        id: "AMD-3",
        type: "covariates",
        date: "2026-04-01",
        prospective: true,
        reason: "Add journal type as planned adjustment.",
      },
    ],
  },
  manuscript: {
    id: "MS-REVIEW-118",
    title: "Citation coverage assistance in clinical trial manuscripts",
    submittedAt: "2026-05-17",
    dataCollectionStartedAt: "2026-02-08",
    unblindedAt: "2026-04-20",
    primaryOutcomes: ["validated citation coverage"],
    secondaryOutcomes: ["reviewer time saved"],
    analysisPlan: {
      model: "negative binomial regression",
      covariates: ["domain", "journal type"],
      subgroups: ["clinical trials", "phase iii trials"],
      multipleTestingCorrection: true,
    },
    samplePlan: {
      analyzedN: 145,
      exclusionCriteria: ["non-english manuscript"],
    },
    claims: {
      exploratoryFindings: ["phase iii trials"],
      exploratoryLabelingComplete: false,
      subgroupsPresentedAsConfirmatory: false,
    },
  },
};

const holdPacket = {
  registration: {
    id: "OSF-HOLD-771",
    registry: "OSF",
    registeredAt: "2026-03-10",
    dataCollectionStartedAt: "2026-02-20",
    primaryOutcomes: ["replication success rate"],
    secondaryOutcomes: ["reviewer confidence", "analysis runtime"],
    analysisPlan: {
      model: "logistic regression",
      covariates: ["domain", "sample size"],
      subgroups: ["molecular biology"],
      requiresMultipleTestingCorrection: true,
    },
    samplePlan: {
      targetN: 300,
      exclusionCriteria: ["missing raw data", "unlicensed code"],
    },
    amendments: [
      {
        id: "AMD-LATE-1",
        type: "primary-outcome",
        date: "2026-05-01",
        prospective: false,
        reason: "Changed after outcome inspection.",
      },
    ],
  },
  manuscript: {
    id: "MS-HOLD-771",
    title: "Automated reproducibility screening across benchmark papers",
    submittedAt: "2026-05-18",
    dataCollectionStartedAt: "2026-02-20",
    unblindedAt: "2026-04-15",
    primaryOutcomes: ["reviewer confidence", "benchmark score gain"],
    secondaryOutcomes: ["analysis runtime"],
    analysisPlan: {
      model: "random forest classifier",
      covariates: ["domain", "sample size", "journal impact"],
      subgroups: ["molecular biology", "single-cell papers"],
      multipleTestingCorrection: false,
    },
    samplePlan: {
      analyzedN: 198,
      exclusionCriteria: ["unlicensed code", "low citation count"],
    },
    claims: {
      exploratoryFindings: ["single-cell papers"],
      exploratoryLabelingComplete: false,
      subgroupsPresentedAsConfirmatory: true,
    },
  },
};

module.exports = {
  holdPacket,
  readyPacket,
  reviewPacket,
};
