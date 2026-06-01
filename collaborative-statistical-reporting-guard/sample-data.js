const cleanPacket = {
  manuscriptId: "MS-COLLAB-STATS-CLEAN",
  reviewDate: "2026-06-01",
  policy: {
    alpha: 0.05,
    sampleSizeTolerance: 0
  },
  analyses: [
    {
      id: "analysis-primary-response",
      label: "Primary response difference",
      sectionId: "results-primary",
      sampleSizes: {
        text: 128,
        table: 128,
        figure: 128
      },
      pValue: {
        reported: 0.031,
        table: 0.031,
        wording: "statistically significant at alpha 0.05"
      },
      effectSize: {
        text: 0.42,
        table: 0.42
      },
      confidenceInterval: {
        text: { low: 0.08, high: 0.76 },
        table: { low: 0.08, high: 0.76 }
      },
      figureStatistic: {
        figureId: "fig-2",
        value: 0.42
      },
      lockedSection: {
        sectionId: "results-primary",
        locked: true,
        lastStatisticEditAt: "2026-05-28T10:00:00Z",
        approvedAt: "2026-05-29T09:00:00Z"
      },
      reviewerComments: [
        {
          id: "stat-cmt-1",
          blocking: true,
          resolvedAt: "2026-05-30T12:00:00Z"
        }
      ]
    },
    {
      id: "analysis-secondary-response",
      label: "Secondary response difference",
      sectionId: "results-secondary",
      sampleSizes: {
        text: 96,
        table: 96
      },
      pValue: {
        reported: 0.18,
        table: 0.18,
        wording: "not statistically significant"
      },
      effectSize: {
        text: 0.11,
        table: 0.11
      },
      confidenceInterval: {
        text: { low: -0.07, high: 0.29 },
        table: { low: -0.07, high: 0.29 }
      },
      figureStatistic: {
        figureId: "fig-s1",
        value: 0.11
      },
      lockedSection: {
        sectionId: "results-secondary",
        locked: false
      },
      reviewerComments: []
    }
  ]
};

const riskyPacket = {
  manuscriptId: "MS-COLLAB-STATS-RISK",
  reviewDate: "2026-06-01",
  policy: {
    alpha: 0.05,
    sampleSizeTolerance: 0
  },
  analyses: [
    {
      id: "analysis-survival-primary",
      label: "Survival model primary endpoint",
      sectionId: "locked-results",
      sampleSizes: {
        text: 214,
        table: 209,
        figure: 214
      },
      pValue: {
        reported: 0.041,
        table: 0.064,
        wording: "not significant after adjustment"
      },
      effectSize: {
        text: 0.38,
        table: 0.51
      },
      confidenceInterval: {
        text: { low: 0.04, high: 0.72 },
        table: { low: -0.02, high: 0.78 }
      },
      figureStatistic: {
        figureId: "fig-4",
        value: 0.6
      },
      lockedSection: {
        sectionId: "locked-results",
        locked: true,
        lastStatisticEditAt: "2026-05-31T19:00:00Z",
        approvedAt: ""
      },
      reviewerComments: [
        {
          id: "stat-cmt-9",
          blocking: true,
          resolvedAt: ""
        }
      ]
    },
    {
      id: "analysis-biomarker-subgroup",
      label: "Biomarker subgroup model",
      sectionId: "results-subgroups",
      sampleSizes: {
        text: 48
      },
      pValue: {
        reported: 0.12,
        table: 0.12,
        wording: "statistically significant subgroup effect"
      },
      effectSize: {
        text: 0.27
      },
      confidenceInterval: {
        text: { low: -0.18, high: 0.61 },
        table: { low: -0.18, high: 0.61 }
      },
      figureStatistic: {
        figureId: "",
        value: null
      },
      lockedSection: {
        sectionId: "results-subgroups",
        locked: false
      },
      reviewerComments: []
    },
    {
      id: "analysis-exploratory-dose",
      label: "Exploratory dose trend",
      sectionId: "results-exploratory",
      sampleSizes: {
        table: 72,
        figure: 72
      },
      pValue: {},
      confidenceInterval: {
        text: { low: -0.01, high: 0.32 },
        table: { low: -0.04, high: 0.35 }
      },
      lockedSection: {
        sectionId: "results-exploratory",
        locked: false
      },
      reviewerComments: [
        {
          id: "stat-cmt-13",
          blocking: true,
          resolvedAt: ""
        }
      ]
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
