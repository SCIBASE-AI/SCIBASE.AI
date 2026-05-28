const reviewContext = {
  reviewDate: "2026-05-28",
  minimumPower: 0.8,
  defaultAlpha: 0.05,
  minimumSubgroupN: 30,
  minimumEventsPerModel: 10,
};

const underpoweredManuscript = {
  id: "ms-synthetic-power-001",
  title: "Synthetic Biomarker Response Study",
  endpoints: [
    {
      id: "primary-response",
      role: "primary",
      domain: "oncology-biomarker",
      enrolledN: 72,
      excludedN: 3,
      attritionRate: 0.18,
      effectSize: 0.35,
      plannedPower: 0.72,
      alpha: 0.05,
      sampleSizeJustification: null,
      attritionSensitivity: false,
      effectSizeSource: {
        domain: "metabolic-screening",
        citationAgeYears: 8,
      },
    },
    {
      id: "secondary-quality-of-life",
      role: "secondary",
      domain: "oncology-biomarker",
      enrolledN: 72,
      excludedN: 8,
      attritionRate: 0.1,
      effectSize: 0.5,
      plannedPower: 0.81,
      alpha: 0.05,
      sampleSizeJustification: "Exploratory endpoint powered from protocol appendix.",
      attritionSensitivity: true,
      effectSizeSource: {
        domain: "oncology-biomarker",
        citationAgeYears: 2,
      },
      usedInHeadline: true,
    },
  ],
  subgroupClaims: [
    {
      id: "subgroup-young-adults",
      n: 18,
      events: 6,
      modelParameters: 2,
    },
  ],
  claims: [
    {
      id: "claim-response-improves-outcomes",
      confidence: "high",
      requiresPowerEvidence: true,
    },
  ],
};

const sufficientlyPoweredManuscript = {
  id: "ms-synthetic-power-002",
  title: "Synthetic Prospective Materials Trial",
  endpoints: [
    {
      id: "primary-strength",
      role: "primary",
      domain: "materials-testing",
      enrolledN: 210,
      excludedN: 0,
      attritionRate: 0.02,
      effectSize: 0.35,
      plannedPower: 0.86,
      alpha: 0.05,
      sampleSizeJustification: "Prospective calculation for d=0.35, alpha=0.05, power=0.86.",
      attritionSensitivity: true,
      effectSizeSource: {
        domain: "materials-testing",
        citationAgeYears: 1,
      },
    },
  ],
  subgroupClaims: [
    {
      id: "subgroup-batch-a",
      n: 68,
      events: 0,
      modelParameters: null,
    },
  ],
  claims: [
    {
      id: "claim-strength-replicates",
      confidence: "moderate",
      requiresPowerEvidence: true,
    },
  ],
};

module.exports = {
  reviewContext,
  sufficientlyPoweredManuscript,
  underpoweredManuscript,
};
