const blockedManuscript = {
  manuscriptId: 'ms-abstract-risk',
  assessedAt: '2026-05-28T10:10:00Z',
  abstract: {
    background: 'Remote review tools may improve manuscript quality.',
    methods: 'We evaluated 120 participants in a randomized study.',
    results: 'The primary endpoint improved strongly after the assistant was used.',
    conclusions: 'The assistant definitively improves all review outcomes and is ready for clinical deployment.'
  },
  methods: {
    design: 'exploratory observational pilot',
    sampleSize: 84,
    primaryEndpoint: 'review turnaround time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'review turnaround time',
    direction: 'no_clear_effect',
    sampleSize: 84,
    effect: 'median review time changed by 1.1 hours',
    exploratory: true
  },
  limitations: []
};

const revisionManuscript = {
  manuscriptId: 'ms-abstract-incomplete',
  assessedAt: '2026-05-28T10:15:00Z',
  abstract: {
    background: 'A short background is present.',
    methods: 'We evaluated 64 projects in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 64 projects.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 64,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 64,
    exploratory: false
  },
  limitations: ['single-institution pilot']
};

const negatedDesignManuscript = {
  manuscriptId: 'ms-abstract-negated-methods-design',
  assessedAt: '2026-05-30T13:40:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts, but this was not a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const negatedPrimaryEndpointManuscript = {
  manuscriptId: 'ms-abstract-negated-primary-endpoint',
  assessedAt: '2026-05-30T15:05:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint was not comment triage time; reviewer load improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce reviewer load in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const missingSourceEvidenceManuscript = {
  manuscriptId: 'ms-abstract-missing-source-evidence',
  assessedAt: '2026-05-30T15:40:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  limitations: ['single-institution retrospective data']
};

const malformedManuscript = null;

const invalidAssessmentTimestampManuscript = {
  manuscriptId: 'ms-abstract-invalid-assessed-at',
  assessedAt: 'not-a-date',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const impossibleAssessmentTimestampManuscript = {
  manuscriptId: 'ms-abstract-impossible-assessed-at',
  assessedAt: '2026-02-30T10:00:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const resultCertaintyOverclaimManuscript = {
  manuscriptId: 'ms-abstract-result-certainty-overclaim',
  assessedAt: '2026-05-30T02:55:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, showed a statistically significant and clinically meaningful improvement in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings but requires validation.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['confidence interval crosses null']
};

const mixedCertaintyOverclaimManuscript = {
  manuscriptId: 'ms-abstract-mixed-certainty-overclaim',
  assessedAt: '2026-05-30T07:40:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, was not statistically significant but clinically meaningful in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings but requires validation.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['confidence interval crosses null']
};

const conclusionCertaintyOverclaimManuscript = {
  manuscriptId: 'ms-abstract-conclusion-certainty-overclaim',
  assessedAt: '2026-05-30T03:35:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant provides a statistically significant and clinically meaningful improvement but requires validation.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['confidence interval crosses null']
};

const weakLimitationHedgeManuscript = {
  manuscriptId: 'ms-abstract-weak-limitation-hedge',
  assessedAt: '2026-05-30T09:05:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: true
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: true
  },
  limitations: ['confidence interval crosses null']
};

const percentageSampleSizeManuscript = {
  manuscriptId: 'ms-abstract-percentage-sample-size',
  assessedAt: '2026-05-30T08:12:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated manuscripts in a retrospective cohort; 96% used automated screening.',
    results: 'The primary endpoint, comment triage time, improved in 96% of manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const decimalSampleSizeManuscript = {
  manuscriptId: 'ms-abstract-decimal-sample-size',
  assessedAt: '2026-05-30T10:10:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated manuscripts in a retrospective cohort; the baseline ratio was 0.96.',
    results: 'The primary endpoint, comment triage time, had an effect estimate of 0.96.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const durationSampleSizeManuscript = {
  manuscriptId: 'ms-abstract-duration-sample-size',
  assessedAt: '2026-05-30T11:35:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We followed manuscripts for 96 hours in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved by 96 minutes.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const abbreviatedUnitSampleSizeManuscript = {
  manuscriptId: 'ms-abstract-abbreviated-unit-sample-size',
  assessedAt: '2026-05-31T00:20:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We observed manuscripts for 96 h in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, changed after 96 h of follow-up.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const hyphenatedMeasurementSampleSizeManuscript = {
  manuscriptId: 'ms-abstract-hyphenated-measurement-sample-size',
  assessedAt: '2026-05-30T12:25:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We used a 96-hour observation window in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved on a 96-point readiness score.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const ordinalSampleSizeManuscript = {
  manuscriptId: 'ms-abstract-ordinal-sample-size',
  assessedAt: '2026-05-30T13:05:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'The median manuscript was at the 96th percentile in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved at the 96th percentile.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const noDifferenceOutcomeManuscript = {
  manuscriptId: 'ms-abstract-no-difference-drift',
  assessedAt: '2026-05-31T16:55:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, showed no meaningful difference in 96 manuscripts.',
    conclusions: 'Comment triage outcomes were comparable in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const missingResultsEndpointManuscript = {
  manuscriptId: 'ms-abstract-missing-results-endpoint',
  assessedAt: '2026-06-01T11:05:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce reviewer load in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const missingMethodsEndpointManuscript = {
  manuscriptId: 'ms-abstract-missing-methods-endpoint',
  assessedAt: '2026-06-01T14:55:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const sourceEndpointMismatchManuscript = {
  manuscriptId: 'ms-abstract-source-endpoint-mismatch',
  assessedAt: '2026-06-01T13:05:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort using reviewer workload score as the endpoint.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'reviewer workload score',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

const cleanManuscript = {
  manuscriptId: 'ms-abstract-clean',
  assessedAt: '2026-05-28T10:20:00Z',
  abstract: {
    background: 'Automated checks may reduce manual reviewer triage.',
    methods: 'We evaluated 96 manuscripts in a retrospective cohort.',
    results: 'The primary endpoint, comment triage time, improved in 96 manuscripts.',
    conclusions: 'The assistant may reduce comment triage time in similar retrospective settings.'
  },
  methods: {
    design: 'retrospective cohort',
    sampleSize: 96,
    primaryEndpoint: 'comment triage time',
    confidenceIntervalCrossesNull: false
  },
  results: {
    primaryEndpoint: 'comment triage time',
    direction: 'improved',
    sampleSize: 96,
    exploratory: false
  },
  limitations: ['single-institution retrospective data']
};

module.exports = {
  blockedManuscript,
  revisionManuscript,
  negatedDesignManuscript,
  negatedPrimaryEndpointManuscript,
  missingSourceEvidenceManuscript,
  malformedManuscript,
  resultCertaintyOverclaimManuscript,
  mixedCertaintyOverclaimManuscript,
  conclusionCertaintyOverclaimManuscript,
  weakLimitationHedgeManuscript,
  percentageSampleSizeManuscript,
  decimalSampleSizeManuscript,
  durationSampleSizeManuscript,
  abbreviatedUnitSampleSizeManuscript,
  hyphenatedMeasurementSampleSizeManuscript,
  ordinalSampleSizeManuscript,
  noDifferenceOutcomeManuscript,
  missingResultsEndpointManuscript,
  missingMethodsEndpointManuscript,
  sourceEndpointMismatchManuscript,
  invalidAssessmentTimestampManuscript,
  impossibleAssessmentTimestampManuscript,
  cleanManuscript
};
