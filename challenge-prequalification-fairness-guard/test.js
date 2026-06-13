const assert = require('assert');
const {
  evaluatePrequalificationRound,
  buildSampleRound
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testEligibleApplicantIsAcceptedWithPublishedCriteriaAndQuorum() {
  const result = evaluatePrequalificationRound(buildSampleRound());
  const decision = byId(result.decisions, 'applicant-biofoundry');

  assert.equal(decision.decision, 'accept-prequalified');
  assert.equal(decision.weightedScore, 87);
  assert.equal(decision.reviewersCounted, 2);
  assert.deepEqual(decision.criteriaApplied, [
    'domain-fit',
    'data-readiness',
    'safety-plan'
  ]);
}

function testAnonymousScreeningLeakHoldsApplicantForFairnessReview() {
  const result = evaluatePrequalificationRound(buildSampleRound());
  const decision = byId(result.decisions, 'applicant-neuro-lab');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('anonymous-screening-leak'), true);
  assert.equal(decision.reasons.includes('inconsistent-threshold-decision'), true);

  const action = byId(result.remediationActions, 'remediate-applicant-neuro-lab');
  assert.equal(action.action, 'rerun-blinded-prequalification-review');
  assert.equal(action.priority, 'high');
}

function testConflictedAndIncompleteRejectionsStayAuditable() {
  const result = evaluatePrequalificationRound(buildSampleRound());
  const decision = byId(result.decisions, 'applicant-sponsor-alumni');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('reviewer-conflict'), true);
  assert.equal(decision.reasons.includes('missing-rejection-reason'), true);
  assert.equal(decision.appealStatus, 'missing');
}

function testConflictedReviewerScoresDoNotInflateWeightedScore() {
  const round = buildSampleRound();
  round.minReviewers = 1;
  round.applicants = [
    {
      id: 'applicant-conflicted-score',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-conflicted-score',
      reviewerId: 'reviewer-sponsor-advisor',
      anonymousScreeningObserved: true,
      conflict: true,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 100,
        'data-readiness': 100,
        'safety-plan': 100
      }
    },
    {
      applicantId: 'applicant-conflicted-score',
      reviewerId: 'reviewer-independent',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['missing independent validation plan'],
      scores: {
        'domain-fit': 50,
        'data-readiness': 50,
        'safety-plan': 50
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-conflicted-score');

  assert.equal(decision.weightedScore, 50);
  assert.equal(decision.reasons.includes('reviewer-conflict'), true);
  assert.equal(decision.reasons.includes('inconsistent-threshold-decision'), true);
}

function testHiddenCriteriaAreBlockedBeforeScreeningResultsPublish() {
  const round = buildSampleRound();
  round.reviews.push({
    applicantId: 'applicant-biofoundry',
    reviewerId: 'reviewer-hidden',
    anonymousScreeningObserved: true,
    conflict: false,
    recommendedDecision: 'reject',
    rejectionReasons: ['private sponsor preference'],
    scores: {
      'domain-fit': 80,
      'data-readiness': 84,
      'safety-plan': 88,
      'brand-prestige': 15
    }
  });

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('unpublished-screening-criterion'), true);
}

function testExpiredAppealWindowHoldsRejectedApplicantForFairnessReview() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-expired-appeal',
      sponsorDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      appealDueAt: '2026-05-27T08:00:00Z'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-expired-appeal',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      scores: {
        'domain-fit': 60,
        'data-readiness': 58,
        'safety-plan': 62
      }
    },
    {
      applicantId: 'applicant-expired-appeal',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      scores: {
        'domain-fit': 62,
        'data-readiness': 57,
        'safety-plan': 61
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-expired-appeal');
  const action = byId(result.remediationActions, 'remediate-applicant-expired-appeal');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.appealStatus, 'expired');
  assert.equal(decision.reasons.includes('expired-appeal-window'), true);
  assert.equal(action.action, 'publish-rejection-reasons-and-appeal-window');
}

function testInvalidAppealWindowHoldsRejectedApplicantForFairnessReview() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-invalid-appeal',
      sponsorDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      appealDueAt: 'not-a-date'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-invalid-appeal',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      scores: {
        'domain-fit': 60,
        'data-readiness': 58,
        'safety-plan': 62
      }
    },
    {
      applicantId: 'applicant-invalid-appeal',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      scores: {
        'domain-fit': 62,
        'data-readiness': 57,
        'safety-plan': 61
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-invalid-appeal');
  const action = byId(result.remediationActions, 'remediate-applicant-invalid-appeal');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.appealStatus, 'invalid');
  assert.equal(decision.reasons.includes('invalid-appeal-window'), true);
  assert.equal(action.action, 'publish-rejection-reasons-and-appeal-window');
}

function testImpossibleAppealWindowHoldsRejectedApplicantForFairnessReview() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-impossible-appeal',
      sponsorDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      appealDueAt: '2026-06-31T08:00:00Z'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-impossible-appeal',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      scores: {
        'domain-fit': 60,
        'data-readiness': 58,
        'safety-plan': 62
      }
    },
    {
      applicantId: 'applicant-impossible-appeal',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['evidence package missed challenge-specific validation'],
      scores: {
        'domain-fit': 62,
        'data-readiness': 57,
        'safety-plan': 61
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-impossible-appeal');
  const action = byId(result.remediationActions, 'remediate-applicant-impossible-appeal');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.appealStatus, 'invalid');
  assert.equal(decision.reasons.includes('invalid-appeal-window'), true);
  assert.equal(action.action, 'publish-rejection-reasons-and-appeal-window');
}

function testInvalidCriterionWeightsHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.criteria = [
    {
      id: 'domain-fit',
      label: 'Domain fit for the scientific challenge',
      weight: 60
    },
    {
      id: 'data-readiness',
      label: 'Evidence that required data and tools are ready',
      weight: 60
    },
    {
      id: 'safety-plan',
      label: 'Risk, NDA, and responsible-use plan',
      weight: 25
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');
  const action = byId(result.remediationActions, 'remediate-applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('criteria-weight-total-invalid'), true);
  assert.equal(action.action, 'publish-valid-weighted-scoring-rubric');
  assert.equal(action.priority, 'high');
}

function testInvalidIndividualCriterionWeightsHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.criteria = [
    {
      id: 'domain-fit',
      label: 'Domain fit for the scientific challenge',
      weight: 120
    },
    {
      id: 'data-readiness',
      label: 'Evidence that required data and tools are ready',
      weight: -20
    },
    {
      id: 'safety-plan',
      label: 'Risk, NDA, and responsible-use plan',
      weight: 0
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');
  const action = byId(result.remediationActions, 'remediate-applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('criteria-weight-value-invalid'), true);
  assert.equal(action.action, 'publish-valid-weighted-scoring-rubric');
  assert.equal(action.priority, 'high');
}

function testDuplicatePublishedCriterionIdsHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.criteria = [
    {
      id: 'domain-fit',
      label: 'Domain fit for the scientific challenge',
      weight: 50
    },
    {
      id: 'domain-fit',
      label: 'Duplicated sponsor rubric identifier',
      weight: 25
    },
    {
      id: 'safety-plan',
      label: 'Risk, NDA, and responsible-use plan',
      weight: 25
    }
  ];
  round.applicants = [
    {
      id: 'applicant-duplicate-criterion',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-duplicate-criterion',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'safety-plan': 92
      }
    },
    {
      applicantId: 'applicant-duplicate-criterion',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 96,
        'safety-plan': 94
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-duplicate-criterion');
  const action = byId(result.remediationActions, 'remediate-applicant-duplicate-criterion');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('duplicate-published-criterion'), true);
  assert.equal(action.action, 'publish-unique-screening-criteria');
  assert.equal(action.priority, 'high');
}

function testWhitespaceVariantCriterionIdsHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.criteria = [
    {
      id: 'domain-fit',
      label: 'Domain fit for the scientific challenge',
      weight: 50
    },
    {
      id: ' domain-fit ',
      label: 'Whitespace-padded duplicate sponsor rubric identifier',
      weight: 25
    },
    {
      id: 'safety-plan',
      label: 'Risk, NDA, and responsible-use plan',
      weight: 25
    }
  ];
  round.applicants = [
    {
      id: 'applicant-normalized-criterion-id',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-normalized-criterion-id',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        ' domain-fit ': 95,
        'safety-plan': 92
      }
    },
    {
      applicantId: 'applicant-normalized-criterion-id',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 96,
        ' domain-fit ': 94,
        'safety-plan': 94
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-normalized-criterion-id');
  const action = byId(result.remediationActions, 'remediate-applicant-normalized-criterion-id');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('duplicate-published-criterion'), true);
  assert.equal(action.action, 'publish-unique-screening-criteria');
  assert.equal(action.priority, 'high');
}

function testMissingPublishedCriterionIdsHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.criteria = [
    {
      id: 'domain-fit',
      label: 'Domain fit for the scientific challenge',
      weight: 50
    },
    {
      id: '   ',
      label: 'Blank sponsor rubric identifier',
      weight: 25
    },
    {
      id: 'safety-plan',
      label: 'Risk, NDA, and responsible-use plan',
      weight: 25
    }
  ];
  round.applicants = [
    {
      id: 'applicant-missing-criterion-id',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-missing-criterion-id',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        '   ': 95,
        'safety-plan': 92
      }
    },
    {
      applicantId: 'applicant-missing-criterion-id',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 96,
        '   ': 94,
        'safety-plan': 94
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-missing-criterion-id');
  const action = byId(result.remediationActions, 'remediate-applicant-missing-criterion-id');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('missing-published-criterion-id'), true);
  assert.equal(action.action, 'publish-complete-screening-criteria');
  assert.equal(action.priority, 'high');
}

function testInvalidPassThresholdHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.passThreshold = -5;

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');
  const action = byId(result.remediationActions, 'remediate-applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('pass-threshold-invalid'), true);
  assert.equal(action.action, 'publish-valid-prequalification-threshold');
  assert.equal(action.priority, 'high');
}

function testInvalidReviewerQuorumHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.minReviewers = 0;
  round.applicants = [
    {
      id: 'applicant-invalid-reviewer-quorum',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-invalid-reviewer-quorum',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 93
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-invalid-reviewer-quorum');
  const action = byId(result.remediationActions, 'remediate-applicant-invalid-reviewer-quorum');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('reviewer-quorum-invalid'), true);
  assert.equal(action.action, 'publish-valid-reviewer-quorum');
  assert.equal(action.priority, 'high');
}

function testInvalidReviewerScoreValuesHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-invalid-reviewer-score',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-invalid-reviewer-score',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 140,
        'data-readiness': 96,
        'safety-plan': 94
      }
    },
    {
      applicantId: 'applicant-invalid-reviewer-score',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 93
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-invalid-reviewer-score');
  const action = byId(result.remediationActions, 'remediate-applicant-invalid-reviewer-score');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('reviewer-score-value-invalid'), true);
  assert.equal(action.action, 'publish-valid-reviewer-score-evidence');
  assert.equal(action.priority, 'high');
}

function testInvalidSponsorDecisionHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-invalid-sponsor-decision',
      sponsorDecision: 'waitlist',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-invalid-sponsor-decision',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 94
      }
    },
    {
      applicantId: 'applicant-invalid-sponsor-decision',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 93
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-invalid-sponsor-decision');
  const action = byId(result.remediationActions, 'remediate-applicant-invalid-sponsor-decision');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('sponsor-decision-invalid'), true);
  assert.equal(action.action, 'publish-valid-sponsor-decision');
  assert.equal(action.priority, 'high');
}

function testMissingApplicantIdentityHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: '   ',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: '   ',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 94
      }
    },
    {
      applicantId: '   ',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 93
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'unidentified-applicant');
  const action = byId(result.remediationActions, 'remediate-unidentified-applicant');

  assert.equal(decision.applicantId, 'unidentified-applicant');
  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('missing-applicant-identity'), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
}

function testDuplicateApplicantIdentitiesHoldPrequalificationRound() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: ' applicant-duplicate ',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    },
    {
      id: 'applicant-duplicate',
      sponsorDecision: 'reject',
      rejectionReasons: ['duplicate entry should be resolved before screening'],
      appealDueAt: '2026-06-04T08:00:00Z'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-duplicate',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 94
      }
    },
    {
      applicantId: 'applicant-duplicate',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 93
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decisions = result.decisions.filter(
    (decision) => decision.applicantId === 'applicant-duplicate'
  );
  const action = byId(result.remediationActions, 'remediate-applicant-duplicate');

  assert.equal(decisions.length, 2);
  assert.equal(decisions.every((decision) => decision.decision === 'hold-for-fairness-review'), true);
  assert.equal(decisions.every((decision) => decision.reasons.includes('duplicate-applicant-identity')), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
}

function testMalformedApplicantEntryHoldsPrequalificationRoundWithoutCrashing() {
  const round = buildSampleRound();
  round.applicants = [null];
  round.reviews = [];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'unidentified-applicant');
  const action = byId(result.remediationActions, 'remediate-unidentified-applicant');

  assert.equal(decision.applicantId, 'unidentified-applicant');
  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('malformed-applicant-entry'), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
}

function testMissingRejectionReasonListHoldsWithoutCrashing() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-missing-rejection-list',
      sponsorDecision: 'reject',
      appealDueAt: '2026-06-04T08:00:00Z'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-missing-rejection-list',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['insufficient validation plan'],
      scores: {
        'domain-fit': 58,
        'data-readiness': 60,
        'safety-plan': 62
      }
    },
    {
      applicantId: 'applicant-missing-rejection-list',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['insufficient validation plan'],
      scores: {
        'domain-fit': 59,
        'data-readiness': 61,
        'safety-plan': 60
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-missing-rejection-list');
  const action = byId(result.remediationActions, 'remediate-applicant-missing-rejection-list');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.deepEqual(decision.rejectionReasons, []);
  assert.equal(decision.reasons.includes('missing-rejection-reason'), true);
  assert.equal(action.action, 'publish-rejection-reasons-and-appeal-window');
}

function testBlankRejectionReasonTextHoldsRejectedApplicant() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-blank-rejection-reason',
      sponsorDecision: 'reject',
      rejectionReasons: ['   '],
      appealDueAt: '2026-06-04T08:00:00Z'
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-blank-rejection-reason',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['insufficient validation plan'],
      scores: {
        'domain-fit': 58,
        'data-readiness': 60,
        'safety-plan': 62
      }
    },
    {
      applicantId: 'applicant-blank-rejection-reason',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'reject',
      rejectionReasons: ['insufficient validation plan'],
      scores: {
        'domain-fit': 59,
        'data-readiness': 61,
        'safety-plan': 60
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-blank-rejection-reason');
  const action = byId(result.remediationActions, 'remediate-applicant-blank-rejection-reason');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.deepEqual(decision.rejectionReasons, []);
  assert.equal(decision.reasons.includes('missing-rejection-reason'), true);
  assert.equal(action.action, 'publish-rejection-reasons-and-appeal-window');
}

function testIncompleteReviewerScoreEvidenceHoldsWithoutCrashing() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-incomplete-review-evidence',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-incomplete-review-evidence',
      reviewerId: 'reviewer-incomplete',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: []
    },
    {
      applicantId: 'applicant-incomplete-review-evidence',
      reviewerId: 'reviewer-partial',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 90
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-incomplete-review-evidence');
  const action = byId(result.remediationActions, 'remediate-applicant-incomplete-review-evidence');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.weightedScore, 36);
  assert.equal(decision.reasons.includes('missing-published-criterion-score'), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
}

function testMissingReviewListHoldsPrequalificationRoundWithoutCrashing() {
  const round = buildSampleRound();
  delete round.reviews;
  round.applicants = [
    {
      id: 'applicant-missing-review-list',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-missing-review-list');
  const action = byId(result.remediationActions, 'remediate-applicant-missing-review-list');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('missing-review-list'), true);
  assert.equal(decision.reviewersCounted, 0);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
}

function testMalformedReviewEntryHoldsPrequalificationRoundWithoutCrashing() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-malformed-review-entry',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    null,
    {
      applicantId: 'applicant-malformed-review-entry',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 93
      }
    },
    {
      applicantId: 'applicant-malformed-review-entry',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 91
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-malformed-review-entry');
  const action = byId(result.remediationActions, 'remediate-applicant-malformed-review-entry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reviewersCounted, 2);
  assert.equal(decision.reasons.includes('malformed-review-entry'), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
}

function testMissingCriteriaListHoldsPrequalificationRoundWithoutCrashing() {
  const round = buildSampleRound();
  delete round.criteria;
  round.applicants = [
    {
      id: 'applicant-missing-criteria-list',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-missing-criteria-list',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 93
      }
    },
    {
      applicantId: 'applicant-missing-criteria-list',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 91
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-missing-criteria-list');
  const action = byId(result.remediationActions, 'remediate-applicant-missing-criteria-list');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('missing-published-criteria-list'), true);
  assert.deepEqual(decision.criteriaApplied, []);
  assert.equal(decision.weightedScore, 0);
  assert.equal(action.action, 'publish-complete-screening-criteria');
  assert.equal(action.priority, 'high');
  assert.ok(result.criteriaDigest.startsWith('sha256:'));
}

function testMalformedCriterionEntryHoldsPrequalificationRoundWithoutCrashing() {
  const round = buildSampleRound();
  round.criteria = [null];
  round.applicants = [
    {
      id: 'applicant-malformed-criterion-entry',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-malformed-criterion-entry');
  const action = byId(result.remediationActions, 'remediate-applicant-malformed-criterion-entry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('malformed-published-criterion-entry'), true);
  assert.equal(action.action, 'publish-complete-screening-criteria');
  assert.equal(action.priority, 'high');
  assert.ok(result.criteriaDigest.startsWith('sha256:'));
}

function testMissingApplicantListHoldsPrequalificationRoundWithoutCrashing() {
  const round = buildSampleRound();
  delete round.applicants;

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'unidentified-applicant');
  const action = byId(result.remediationActions, 'remediate-unidentified-applicant');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('missing-applicant-list'), true);
  assert.deepEqual(decision.rejectionReasons, []);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
  assert.equal(result.summary.held, 1);
}

function testMalformedPrequalificationRoundHoldsWithoutCrashing() {
  const result = evaluatePrequalificationRound(null);
  const decision = byId(result.decisions, 'unidentified-applicant');
  const action = byId(result.remediationActions, 'remediate-unidentified-applicant');

  assert.equal(result.challengeId, 'unidentified-challenge');
  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('malformed-prequalification-round'), true);
  assert.equal(decision.reasons.includes('missing-published-criteria-list'), true);
  assert.equal(decision.reasons.includes('missing-review-list'), true);
  assert.equal(decision.reasons.includes('missing-applicant-list'), true);
  assert.deepEqual(decision.criteriaApplied, []);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
  assert.equal(result.summary.held, 1);
}

function testMissingChallengeIdentityHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.challengeId = '   ';
  round.applicants = [
    {
      id: 'applicant-missing-challenge-identity',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-missing-challenge-identity',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 93
      }
    },
    {
      applicantId: 'applicant-missing-challenge-identity',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 91
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-missing-challenge-identity');
  const action = byId(result.remediationActions, 'remediate-applicant-missing-challenge-identity');

  assert.equal(result.challengeId, 'unidentified-challenge');
  assert.equal(decision.challengeId, 'unidentified-challenge');
  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('missing-challenge-identity'), true);
  assert.equal(action.action, 'complete-challenge-identity-evidence');
  assert.equal(action.priority, 'high');
}

function testInvalidGeneratedAtHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.generatedAt = 'not-a-date';
  round.applicants = [
    {
      id: 'applicant-invalid-generated-at',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-invalid-generated-at',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 93
      }
    },
    {
      applicantId: 'applicant-invalid-generated-at',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 91
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-invalid-generated-at');
  const action = byId(result.remediationActions, 'remediate-applicant-invalid-generated-at');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('generated-at-invalid'), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
}

function testImpossibleGeneratedAtHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.generatedAt = '2026-02-30T08:00:00Z';
  round.applicants = [
    {
      id: 'applicant-impossible-generated-at',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-impossible-generated-at',
      reviewerId: 'reviewer-independent-a',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 94,
        'data-readiness': 96,
        'safety-plan': 93
      }
    },
    {
      applicantId: 'applicant-impossible-generated-at',
      reviewerId: 'reviewer-independent-b',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 94,
        'safety-plan': 91
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-impossible-generated-at');
  const action = byId(result.remediationActions, 'remediate-applicant-impossible-generated-at');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('generated-at-invalid'), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
  assert.equal(action.priority, 'high');
}

function testDuplicateReviewerScoreEvidenceDoesNotSatisfyQuorum() {
  const round = buildSampleRound();
  round.minReviewers = 2;
  round.applicants = [
    {
      id: 'applicant-duplicate-reviewer',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-duplicate-reviewer',
      reviewerId: 'reviewer-repeat',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 96,
        'data-readiness': 94,
        'safety-plan': 95
      }
    },
    {
      applicantId: 'applicant-duplicate-reviewer',
      reviewerId: 'reviewer-repeat',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 93,
        'safety-plan': 94
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-duplicate-reviewer');
  const action = byId(result.remediationActions, 'remediate-applicant-duplicate-reviewer');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reviewersCounted, 1);
  assert.equal(decision.reasons.includes('duplicate-reviewer-score-evidence'), true);
  assert.equal(decision.reasons.includes('reviewer-quorum-shortfall'), true);
  assert.equal(action.action, 'deduplicate-reviewer-score-evidence');
  assert.equal(action.priority, 'high');
}

function testMissingReviewerIdentityDoesNotSatisfyQuorum() {
  const round = buildSampleRound();
  round.minReviewers = 2;
  round.applicants = [
    {
      id: 'applicant-missing-reviewer-identity',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  round.reviews = [
    {
      applicantId: 'applicant-missing-reviewer-identity',
      reviewerId: '   ',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 96,
        'data-readiness': 94,
        'safety-plan': 95
      }
    },
    {
      applicantId: 'applicant-missing-reviewer-identity',
      anonymousScreeningObserved: true,
      conflict: false,
      recommendedDecision: 'accept',
      rejectionReasons: [],
      scores: {
        'domain-fit': 92,
        'data-readiness': 93,
        'safety-plan': 94
      }
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-missing-reviewer-identity');
  const action = byId(result.remediationActions, 'remediate-applicant-missing-reviewer-identity');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reviewersCounted, 0);
  assert.equal(decision.reasons.includes('missing-reviewer-identity'), true);
  assert.equal(decision.reasons.includes('reviewer-quorum-shortfall'), true);
  assert.equal(action.action, 'complete-prequalification-evidence');
}

function testAwardPublicationMetadataHoldsPrequalificationRound() {
  const round = buildSampleRound();
  round.awardPublication = {
    winnerApplicantId: 'applicant-biofoundry',
    publishAt: '2026-06-20T08:00:00Z',
    namedWinnerConsent: true
  };
  round.applicants = [
    {
      id: 'applicant-biofoundry',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = byId(result.decisions, 'applicant-biofoundry');
  const action = byId(result.remediationActions, 'remediate-applicant-biofoundry');

  assert.equal(decision.decision, 'hold-for-fairness-review');
  assert.equal(decision.reasons.includes('premature-award-publication-metadata'), true);
  assert.equal(action.action, 'separate-award-publication-evidence');
  assert.equal(action.priority, 'high');
}

function testAuditDigestIsDeterministicAndPrivateFree() {
  const first = evaluatePrequalificationRound(buildSampleRound());
  const second = evaluatePrequalificationRound(buildSampleRound());

  assert.equal(first.auditDigest, second.auditDigest);
  assert.ok(first.auditDigest.startsWith('sha256:'));
  assert.equal(first.summary.accepted, 1);
  assert.equal(first.summary.held, 3);
  assert.equal(JSON.stringify(first).includes('private@'), false);
  assert.equal(JSON.stringify(first).includes('government_id'), false);
}

function testApplicantDirectIdentifiersAreRedactedFromDecisionsAndActions() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'solver.private@example.edu',
      sponsorDecision: 'reject',
      rejectionReasons: [],
      appealDueAt: '2026-06-30T00:00:00Z'
    }
  ];
  round.reviews = [
    {
      applicantId: 'solver.private@example.edu',
      reviewerId: 'reviewer-1',
      criterionId: 'technical-plan',
      score: 66,
      conflict: false
    }
  ];

  const result = evaluatePrequalificationRound(round);
  const decision = result.decisions[0];
  const action = result.remediationActions[0];
  const packetJson = JSON.stringify(result);

  assert.match(decision.applicantId, /^applicant-redacted-[a-f0-9]{8}$/);
  assert.equal(decision.id, decision.applicantId);
  assert.equal(action.applicantId, decision.applicantId);
  assert.equal(action.id, `remediate-${decision.applicantId}`);
  assert.equal(packetJson.includes('solver.private@example.edu'), false);
}

const tests = [
  testEligibleApplicantIsAcceptedWithPublishedCriteriaAndQuorum,
  testAnonymousScreeningLeakHoldsApplicantForFairnessReview,
  testConflictedAndIncompleteRejectionsStayAuditable,
  testConflictedReviewerScoresDoNotInflateWeightedScore,
  testHiddenCriteriaAreBlockedBeforeScreeningResultsPublish,
  testExpiredAppealWindowHoldsRejectedApplicantForFairnessReview,
  testInvalidAppealWindowHoldsRejectedApplicantForFairnessReview,
  testImpossibleAppealWindowHoldsRejectedApplicantForFairnessReview,
  testInvalidCriterionWeightsHoldPrequalificationRound,
  testInvalidIndividualCriterionWeightsHoldPrequalificationRound,
  testDuplicatePublishedCriterionIdsHoldPrequalificationRound,
  testWhitespaceVariantCriterionIdsHoldPrequalificationRound,
  testMissingPublishedCriterionIdsHoldPrequalificationRound,
  testInvalidPassThresholdHoldsPrequalificationRound,
  testInvalidReviewerQuorumHoldsPrequalificationRound,
  testInvalidReviewerScoreValuesHoldPrequalificationRound,
  testInvalidSponsorDecisionHoldsPrequalificationRound,
  testMissingApplicantIdentityHoldsPrequalificationRound,
  testDuplicateApplicantIdentitiesHoldPrequalificationRound,
  testMalformedApplicantEntryHoldsPrequalificationRoundWithoutCrashing,
  testMissingRejectionReasonListHoldsWithoutCrashing,
  testBlankRejectionReasonTextHoldsRejectedApplicant,
  testIncompleteReviewerScoreEvidenceHoldsWithoutCrashing,
  testMissingReviewListHoldsPrequalificationRoundWithoutCrashing,
  testMalformedReviewEntryHoldsPrequalificationRoundWithoutCrashing,
  testMissingCriteriaListHoldsPrequalificationRoundWithoutCrashing,
  testMalformedCriterionEntryHoldsPrequalificationRoundWithoutCrashing,
  testMissingApplicantListHoldsPrequalificationRoundWithoutCrashing,
  testMalformedPrequalificationRoundHoldsWithoutCrashing,
  testMissingChallengeIdentityHoldsPrequalificationRound,
  testInvalidGeneratedAtHoldsPrequalificationRound,
  testImpossibleGeneratedAtHoldsPrequalificationRound,
  testDuplicateReviewerScoreEvidenceDoesNotSatisfyQuorum,
  testMissingReviewerIdentityDoesNotSatisfyQuorum,
  testAwardPublicationMetadataHoldsPrequalificationRound,
  testAuditDigestIsDeterministicAndPrivateFree,
  testApplicantDirectIdentifiersAreRedactedFromDecisionsAndActions
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} challenge prequalification fairness tests passed`);
