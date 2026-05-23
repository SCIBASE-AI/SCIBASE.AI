const samplePacket = {
  manuscriptId: 'ms-randomized-review-demo',
  generatedAt: '2026-05-23T06:00:00Z',
  studies: [
    {
      id: 'trial-microbiome-01',
      design: 'parallel clinical trial',
      population: 'adult participants',
      arms: [
        {id: 'control', enrolled: 42, strata: {siteA: 20, siteB: 22}},
        {id: 'probiotic', enrolled: 41, strata: {siteA: 21, siteB: 20}},
      ],
      randomization: {
        sequenceEvidence: false,
        method: '',
        allocationConcealment: false,
        stratificationFactors: ['siteA', 'siteB'],
        maxArmImbalancePercent: 15,
      },
      blinding: {
        participant: true,
        careProvider: true,
        outcomeAssessor: true,
        analyst: true,
        armLabelExposure: [],
        unblindingEvents: [],
      },
      exclusions: [],
    },
    {
      id: 'animal-stroke-02',
      design: 'preclinical animal experiment',
      population: 'rat ischemia model',
      arms: [
        {id: 'sham', enrolled: 18, strata: {male: 9, female: 9}},
        {id: 'treatment', enrolled: 18, strata: {male: 10, female: 8}},
      ],
      randomization: {
        sequenceEvidence: true,
        method: 'blocked randomization',
        allocationConcealment: true,
        stratificationFactors: ['male', 'female'],
        maxArmImbalancePercent: 20,
      },
      blinding: {
        participant: false,
        careProvider: false,
        outcomeAssessor: true,
        analyst: false,
        armLabelExposure: [
          {artifact: 'analysis-notebook.ipynb', label: 'treatment arm names visible before primary analysis'},
        ],
        unblindingEvents: [
          {role: 'analyst', occurredAt: '2026-04-11', beforePrimaryEndpointLock: true},
        ],
      },
      exclusions: [
        {participantId: 'rat-17', afterRandomization: true, reason: 'outlier response', blindedDecision: false},
      ],
    },
    {
      id: 'trial-oncology-04',
      design: 'double-blind randomized trial',
      population: 'human oncology participants',
      arms: [
        {id: 'placebo', enrolled: 120, strata: {siteA: 60, siteB: 60}},
        {id: 'therapy', enrolled: 118, strata: {siteA: 59, siteB: 59}},
      ],
      randomization: {
        sequenceEvidence: true,
        method: 'centralized permuted blocks',
        allocationConcealment: true,
        stratificationFactors: ['siteA', 'siteB'],
        maxArmImbalancePercent: 10,
      },
      blinding: {
        participant: true,
        careProvider: true,
        outcomeAssessor: true,
        analyst: true,
        armLabelExposure: [],
        unblindingEvents: [],
      },
      exclusions: [
        {participantId: 'p-099', afterRandomization: true, reason: 'withdrew consent', blindedDecision: true},
      ],
    },
  ],
};

module.exports = {
  samplePacket,
};
