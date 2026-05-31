const unsafePacket = {
  title: 'Early biomarker screen for inflammatory flare risk',
  audience: {
    name: 'patient and funder lay audience',
    maxGradeLevel: 8,
    jargonTerms: ['cytokine', 'proteomic', 'longitudinal'],
  },
  sourceEvidence: [
    {
      id: 'E1',
      text: 'In a small observational cohort of 42 adults, cytokine panel changes were associated with later flare risk.',
      terms: ['small', 'observational', 'cohort', 'cytokine', 'associated', 'flare', 'risk'],
    },
    {
      id: 'E2',
      text: 'The study did not test treatment decisions and did not include children or pregnant patients.',
      terms: ['not', 'treatment', 'children', 'pregnant', 'patients', 'limitations'],
    },
    {
      id: 'E3',
      text: 'External validation is pending, and the authors recommend cautious interpretation before clinical use.',
      terms: ['validation', 'pending', 'cautious', 'interpretation', 'clinical'],
    },
  ],
  requiredLimitations: [
    'small observational cohort',
    'external validation pending',
    'not a treatment recommendation',
  ],
  summary:
    'This proteomic cytokine breakthrough proves doctors can prevent inflammatory flares before they happen. Patients should ask their doctor to replace treatment with this simple blood test because it works for everyone. The longitudinal model identifies immune dysregulation and delivers actionable clinical certainty.',
};

const safePacket = {
  title: 'Early biomarker screen for inflammatory flare risk',
  audience: {
    name: 'patient and funder lay audience',
    maxGradeLevel: 8,
    jargonTerms: ['cytokine', 'proteomic', 'longitudinal'],
  },
  sourceEvidence: unsafePacket.sourceEvidence,
  requiredLimitations: unsafePacket.requiredLimitations,
  summary:
    'A small observational study found blood changes that may be linked with later flare risk. Outside validation is still pending. This is not a treatment recommendation, and patients should not change care based on this result alone.',
};

module.exports = { unsafePacket, safePacket };
