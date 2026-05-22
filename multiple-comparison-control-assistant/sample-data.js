const policy = {
  pValueThreshold: 0.05,
  fdrThreshold: 0.05,
  familySizeWarningThreshold: 5,
}

const manuscripts = [
  {
    manuscriptId: "cardio-biomarker-study",
    title: "Cardiac Biomarker Response Study",
    analysisFamilies: [
      {
        familyId: "primary-biomarkers",
        label: "Primary biomarker outcomes",
        intent: "confirmatory",
        declaredFamilySize: 3,
        correctionMethod: "benjamini-hochberg",
        endpointHierarchy: {
          primaryEndpoints: ["troponin-change"],
          secondaryEndpoints: ["crp-change", "bnp-change"],
        },
        tests: [
          {
            testId: "troponin-change",
            outcome: "Troponin change",
            pValue: 0.003,
            qValue: 0.009,
            claimedSignificant: true,
          },
          {
            testId: "crp-change",
            outcome: "CRP change",
            pValue: 0.021,
            qValue: 0.031,
            claimedSignificant: true,
          },
          {
            testId: "bnp-change",
            outcome: "BNP change",
            pValue: 0.14,
            qValue: 0.14,
            claimedSignificant: false,
          },
        ],
      },
    ],
    resultStatements: [
      {
        familyId: "primary-biomarkers",
        claimId: "claim-cardio-1",
        testId: "troponin-change",
        text: "Troponin change remained significant after Benjamini-Hochberg correction.",
        usesSignificanceLanguage: true,
      },
      {
        familyId: "primary-biomarkers",
        claimId: "claim-cardio-2",
        testId: "bnp-change",
        text: "BNP did not pass the adjusted threshold.",
        usesSignificanceLanguage: false,
      },
    ],
  },
  {
    manuscriptId: "neuro-screening-draft",
    title: "Neuro Screening Draft",
    analysisFamilies: [
      {
        familyId: "neuro-panel",
        label: "Neurocognitive screening panel",
        intent: "confirmatory",
        declaredFamilySize: 8,
        correctionMethod: "none",
        tests: [
          { testId: "memory", outcome: "Memory", pValue: 0.018, claimedSignificant: true },
          { testId: "attention", outcome: "Attention", pValue: 0.041, claimedSignificant: true },
          { testId: "motor", outcome: "Motor", pValue: 0.22, claimedSignificant: false },
          { testId: "language", outcome: "Language", pValue: 0.031, claimedSignificant: true },
          { testId: "spatial", outcome: "Spatial", pValue: 0.08, claimedSignificant: false },
          { testId: "sleep", outcome: "Sleep", pValue: 0.19, claimedSignificant: false },
          { testId: "mood", outcome: "Mood", pValue: 0.049, claimedSignificant: true },
          { testId: "fatigue", outcome: "Fatigue", pValue: 0.16, claimedSignificant: false },
        ],
      },
    ],
    resultStatements: [
      {
        familyId: "neuro-panel",
        claimId: "claim-neuro-1",
        testId: "memory",
        text: "Memory showed a significant effect at p < 0.05.",
        usesSignificanceLanguage: true,
      },
      {
        familyId: "neuro-panel",
        claimId: "claim-neuro-2",
        testId: "attention",
        text: "Attention was significant and confirms the primary hypothesis.",
        usesSignificanceLanguage: true,
      },
    ],
  },
  {
    manuscriptId: "metabolomics-exploration",
    title: "Metabolomics Exploration",
    analysisFamilies: [
      {
        familyId: "metabolite-screen",
        label: "Exploratory metabolite screen",
        intent: "exploratory",
        declaredFamilySize: 4,
        correctionMethod: "benjamini-hochberg",
        tests: [
          {
            testId: "metabolite-a",
            outcome: "Metabolite A",
            pValue: 0.004,
            qValue: 0.041,
            claimedSignificant: true,
          },
          {
            testId: "metabolite-b",
            outcome: "Metabolite B",
            pValue: 0.011,
            qValue: 0.071,
            claimedSignificant: true,
          },
          {
            testId: "metabolite-c",
            outcome: "Metabolite C",
            pValue: 0.052,
            qValue: 0.09,
            claimedSignificant: false,
          },
          {
            testId: "metabolite-d",
            outcome: "Metabolite D",
            pValue: 0.18,
            qValue: 0.21,
            claimedSignificant: false,
          },
        ],
      },
    ],
    resultStatements: [
      {
        familyId: "metabolite-screen",
        claimId: "claim-metab-1",
        testId: "metabolite-a",
        text: "Metabolite A is an exploratory FDR-controlled hit.",
        usesSignificanceLanguage: true,
        exploratoryLabel: true,
      },
      {
        familyId: "metabolite-screen",
        claimId: "claim-metab-2",
        testId: "metabolite-b",
        text: "Metabolite B showed a significant effect that confirms pathway activation.",
        usesSignificanceLanguage: true,
        exploratoryLabel: false,
      },
    ],
  },
]

module.exports = {
  policy,
  manuscripts,
}
