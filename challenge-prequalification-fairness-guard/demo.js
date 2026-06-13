const fs = require('fs');
const path = require('path');
const { evaluatePrequalificationRound, buildSampleRound } = require('./index');

const reportsDir = path.join(__dirname, 'reports');
fs.mkdirSync(reportsDir, { recursive: true });

const result = evaluatePrequalificationRound(buildSampleRound());
const missingCriterionResult = evaluatePrequalificationRound(buildMissingCriterionIdRound());
const normalizedCriterionResult = evaluatePrequalificationRound(buildNormalizedCriterionIdRound());
const invalidScoreResult = evaluatePrequalificationRound(buildInvalidReviewerScoreRound());
const invalidQuorumResult = evaluatePrequalificationRound(buildInvalidReviewerQuorumRound());
const invalidSponsorDecisionResult = evaluatePrequalificationRound(buildInvalidSponsorDecisionRound());
const missingApplicantIdentityResult = evaluatePrequalificationRound(buildMissingApplicantIdentityRound());
const duplicateApplicantIdentityResult = evaluatePrequalificationRound(buildDuplicateApplicantIdentityRound());
const missingReviewListResult = evaluatePrequalificationRound(buildMissingReviewListRound());
const malformedReviewEntryResult = evaluatePrequalificationRound(buildMalformedReviewEntryRound());
const missingCriteriaListResult = evaluatePrequalificationRound(buildMissingCriteriaListRound());
const malformedCriterionEntryResult = evaluatePrequalificationRound(buildMalformedCriterionEntryRound());
const missingApplicantListResult = evaluatePrequalificationRound(buildMissingApplicantListRound());
const malformedPrequalificationRoundResult = evaluatePrequalificationRound(null);
const missingChallengeIdentityResult = evaluatePrequalificationRound(buildMissingChallengeIdentityRound());
const invalidGeneratedAtResult = evaluatePrequalificationRound(buildInvalidGeneratedAtRound());
const impossibleGeneratedAtResult = evaluatePrequalificationRound(buildImpossibleGeneratedAtRound());
const malformedApplicantEntryResult = evaluatePrequalificationRound(buildMalformedApplicantEntryRound());
const blankRejectionReasonResult = evaluatePrequalificationRound(buildBlankRejectionReasonRound());
const impossibleAppealWindowResult = evaluatePrequalificationRound(buildImpossibleAppealWindowRound());

const packetPath = path.join(reportsDir, 'prequalification-fairness-packet.json');
const missingCriterionPacketPath = path.join(reportsDir, 'missing-criterion-id-packet.json');
const normalizedCriterionPacketPath = path.join(reportsDir, 'normalized-criterion-id-packet.json');
const invalidScorePacketPath = path.join(reportsDir, 'invalid-reviewer-score-packet.json');
const invalidQuorumPacketPath = path.join(reportsDir, 'invalid-reviewer-quorum-packet.json');
const invalidSponsorDecisionPacketPath = path.join(
  reportsDir,
  'invalid-sponsor-decision-packet.json'
);
const missingApplicantIdentityPacketPath = path.join(
  reportsDir,
  'missing-applicant-identity-packet.json'
);
const duplicateApplicantIdentityPacketPath = path.join(
  reportsDir,
  'duplicate-applicant-identity-packet.json'
);
const missingReviewListPacketPath = path.join(reportsDir, 'missing-review-list-packet.json');
const malformedReviewEntryPacketPath = path.join(
  reportsDir,
  'malformed-review-entry-packet.json'
);
const missingCriteriaListPacketPath = path.join(reportsDir, 'missing-criteria-list-packet.json');
const malformedCriterionEntryPacketPath = path.join(
  reportsDir,
  'malformed-criterion-entry-packet.json'
);
const missingApplicantListPacketPath = path.join(reportsDir, 'missing-applicant-list-packet.json');
const malformedPrequalificationRoundPacketPath = path.join(
  reportsDir,
  'malformed-prequalification-round-packet.json'
);
const missingChallengeIdentityPacketPath = path.join(
  reportsDir,
  'missing-challenge-identity-packet.json'
);
const invalidGeneratedAtPacketPath = path.join(reportsDir, 'invalid-generated-at-packet.json');
const impossibleGeneratedAtPacketPath = path.join(
  reportsDir,
  'impossible-generated-at-packet.json'
);
const malformedApplicantEntryPacketPath = path.join(
  reportsDir,
  'malformed-applicant-entry-packet.json'
);
const blankRejectionReasonPacketPath = path.join(reportsDir, 'blank-rejection-reason-packet.json');
const impossibleAppealWindowPacketPath = path.join(
  reportsDir,
  'impossible-appeal-window-packet.json'
);
const reportPath = path.join(reportsDir, 'prequalification-fairness-report.md');
const svgPath = path.join(reportsDir, 'summary.svg');

fs.writeFileSync(packetPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(missingCriterionPacketPath, `${JSON.stringify(missingCriterionResult, null, 2)}\n`);
fs.writeFileSync(normalizedCriterionPacketPath, `${JSON.stringify(normalizedCriterionResult, null, 2)}\n`);
fs.writeFileSync(invalidScorePacketPath, `${JSON.stringify(invalidScoreResult, null, 2)}\n`);
fs.writeFileSync(invalidQuorumPacketPath, `${JSON.stringify(invalidQuorumResult, null, 2)}\n`);
fs.writeFileSync(
  invalidSponsorDecisionPacketPath,
  `${JSON.stringify(invalidSponsorDecisionResult, null, 2)}\n`
);
fs.writeFileSync(
  missingApplicantIdentityPacketPath,
  `${JSON.stringify(missingApplicantIdentityResult, null, 2)}\n`
);
fs.writeFileSync(
  duplicateApplicantIdentityPacketPath,
  `${JSON.stringify(duplicateApplicantIdentityResult, null, 2)}\n`
);
fs.writeFileSync(missingReviewListPacketPath, `${JSON.stringify(missingReviewListResult, null, 2)}\n`);
fs.writeFileSync(
  malformedReviewEntryPacketPath,
  `${JSON.stringify(malformedReviewEntryResult, null, 2)}\n`
);
fs.writeFileSync(
  missingCriteriaListPacketPath,
  `${JSON.stringify(missingCriteriaListResult, null, 2)}\n`
);
fs.writeFileSync(
  malformedCriterionEntryPacketPath,
  `${JSON.stringify(malformedCriterionEntryResult, null, 2)}\n`
);
fs.writeFileSync(
  missingApplicantListPacketPath,
  `${JSON.stringify(missingApplicantListResult, null, 2)}\n`
);
fs.writeFileSync(
  malformedPrequalificationRoundPacketPath,
  `${JSON.stringify(malformedPrequalificationRoundResult, null, 2)}\n`
);
fs.writeFileSync(
  missingChallengeIdentityPacketPath,
  `${JSON.stringify(missingChallengeIdentityResult, null, 2)}\n`
);
fs.writeFileSync(
  invalidGeneratedAtPacketPath,
  `${JSON.stringify(invalidGeneratedAtResult, null, 2)}\n`
);
fs.writeFileSync(
  impossibleGeneratedAtPacketPath,
  `${JSON.stringify(impossibleGeneratedAtResult, null, 2)}\n`
);
fs.writeFileSync(
  malformedApplicantEntryPacketPath,
  `${JSON.stringify(malformedApplicantEntryResult, null, 2)}\n`
);
fs.writeFileSync(blankRejectionReasonPacketPath, `${JSON.stringify(blankRejectionReasonResult, null, 2)}\n`);
fs.writeFileSync(
  impossibleAppealWindowPacketPath,
  `${JSON.stringify(impossibleAppealWindowResult, null, 2)}\n`
);

const decisions = result.decisions
  .map(
    (decision) =>
      `- ${decision.applicantId}: ${decision.decision}, score ${decision.weightedScore}, reasons: ${
        decision.reasons.length > 0 ? decision.reasons.join(', ') : 'none'
      }`
  )
  .join('\n');

const actions = result.remediationActions
  .map((action) => `- ${action.id}: ${action.action} (${action.priority})`)
  .join('\n');

const markdown = `# Challenge Prequalification Fairness Guard

Challenge: ${result.challengeId}
Generated: ${result.generatedAt}

## Summary

- Accepted applicants: ${result.summary.accepted}
- Held for fairness review: ${result.summary.held}
- Rejected with audit trail: ${result.summary.rejectedWithAudit}
- Remediation actions: ${result.summary.remediationActions}
- Criteria digest: ${result.criteriaDigest}
- Audit digest: ${result.auditDigest}

## Decisions

${decisions}

## Remediation Actions

${actions}

## Missing Criterion Identifier Packet

- Applicant: ${missingCriterionResult.decisions[0].applicantId}
- Decision: ${missingCriterionResult.decisions[0].decision}
- Reasons: ${missingCriterionResult.decisions[0].reasons.join(', ')}
- Remediation: ${missingCriterionResult.remediationActions[0].action}
- Audit digest: ${missingCriterionResult.auditDigest}

## Normalized Criterion Identifier Packet

- Applicant: ${normalizedCriterionResult.decisions[0].applicantId}
- Decision: ${normalizedCriterionResult.decisions[0].decision}
- Reasons: ${normalizedCriterionResult.decisions[0].reasons.join(', ')}
- Remediation: ${normalizedCriterionResult.remediationActions[0].action}
- Audit digest: ${normalizedCriterionResult.auditDigest}

## Invalid Reviewer Score Packet

- Applicant: ${invalidScoreResult.decisions[0].applicantId}
- Decision: ${invalidScoreResult.decisions[0].decision}
- Reasons: ${invalidScoreResult.decisions[0].reasons.join(', ')}
- Remediation: ${invalidScoreResult.remediationActions[0].action}
- Audit digest: ${invalidScoreResult.auditDigest}

## Invalid Reviewer Quorum Packet

- Applicant: ${invalidQuorumResult.decisions[0].applicantId}
- Decision: ${invalidQuorumResult.decisions[0].decision}
- Reasons: ${invalidQuorumResult.decisions[0].reasons.join(', ')}
- Remediation: ${invalidQuorumResult.remediationActions[0].action}
- Audit digest: ${invalidQuorumResult.auditDigest}

## Invalid Sponsor Decision Packet

- Applicant: ${invalidSponsorDecisionResult.decisions[0].applicantId}
- Decision: ${invalidSponsorDecisionResult.decisions[0].decision}
- Reasons: ${invalidSponsorDecisionResult.decisions[0].reasons.join(', ')}
- Remediation: ${invalidSponsorDecisionResult.remediationActions[0].action}
- Audit digest: ${invalidSponsorDecisionResult.auditDigest}

## Missing Applicant Identity Packet

- Applicant: ${JSON.stringify(missingApplicantIdentityResult.decisions[0].applicantId)}
- Decision: ${missingApplicantIdentityResult.decisions[0].decision}
- Reasons: ${missingApplicantIdentityResult.decisions[0].reasons.join(', ')}
- Remediation: ${missingApplicantIdentityResult.remediationActions[0].action}
- Audit digest: ${missingApplicantIdentityResult.auditDigest}

## Duplicate Applicant Identity Packet

- Applicant: ${duplicateApplicantIdentityResult.decisions[0].applicantId}
- Decision: ${duplicateApplicantIdentityResult.decisions[0].decision}
- Reasons: ${duplicateApplicantIdentityResult.decisions[0].reasons.join(', ')}
- Remediation: ${duplicateApplicantIdentityResult.remediationActions[0].action}
- Audit digest: ${duplicateApplicantIdentityResult.auditDigest}

## Missing Review List Packet

- Applicant: ${missingReviewListResult.decisions[0].applicantId}
- Decision: ${missingReviewListResult.decisions[0].decision}
- Reasons: ${missingReviewListResult.decisions[0].reasons.join(', ')}
- Remediation: ${missingReviewListResult.remediationActions[0].action}
- Audit digest: ${missingReviewListResult.auditDigest}

## Malformed Review Entry Packet

- Applicant: ${malformedReviewEntryResult.decisions[0].applicantId}
- Decision: ${malformedReviewEntryResult.decisions[0].decision}
- Reviewers counted: ${malformedReviewEntryResult.decisions[0].reviewersCounted}
- Reasons: ${malformedReviewEntryResult.decisions[0].reasons.join(', ')}
- Remediation: ${malformedReviewEntryResult.remediationActions[0].action}
- Audit digest: ${malformedReviewEntryResult.auditDigest}

## Missing Criteria List Packet

- Applicant: ${missingCriteriaListResult.decisions[0].applicantId}
- Decision: ${missingCriteriaListResult.decisions[0].decision}
- Reasons: ${missingCriteriaListResult.decisions[0].reasons.join(', ')}
- Remediation: ${missingCriteriaListResult.remediationActions[0].action}
- Audit digest: ${missingCriteriaListResult.auditDigest}

## Malformed Criterion Entry Packet

- Applicant: ${malformedCriterionEntryResult.decisions[0].applicantId}
- Decision: ${malformedCriterionEntryResult.decisions[0].decision}
- Reasons: ${malformedCriterionEntryResult.decisions[0].reasons.join(', ')}
- Remediation: ${malformedCriterionEntryResult.remediationActions[0].action}
- Audit digest: ${malformedCriterionEntryResult.auditDigest}

## Missing Applicant List Packet

- Applicant: ${missingApplicantListResult.decisions[0].applicantId}
- Decision: ${missingApplicantListResult.decisions[0].decision}
- Reasons: ${missingApplicantListResult.decisions[0].reasons.join(', ')}
- Remediation: ${missingApplicantListResult.remediationActions[0].action}
- Audit digest: ${missingApplicantListResult.auditDigest}

## Malformed Prequalification Round Packet

- Challenge: ${malformedPrequalificationRoundResult.challengeId}
- Applicant: ${malformedPrequalificationRoundResult.decisions[0].applicantId}
- Decision: ${malformedPrequalificationRoundResult.decisions[0].decision}
- Reasons: ${malformedPrequalificationRoundResult.decisions[0].reasons.join(', ')}
- Remediation: ${malformedPrequalificationRoundResult.remediationActions[0].action}
- Audit digest: ${malformedPrequalificationRoundResult.auditDigest}

## Missing Challenge Identity Packet

- Challenge: ${missingChallengeIdentityResult.challengeId}
- Applicant: ${missingChallengeIdentityResult.decisions[0].applicantId}
- Decision: ${missingChallengeIdentityResult.decisions[0].decision}
- Reasons: ${missingChallengeIdentityResult.decisions[0].reasons.join(', ')}
- Remediation: ${missingChallengeIdentityResult.remediationActions[0].action}
- Audit digest: ${missingChallengeIdentityResult.auditDigest}

## Invalid Generated At Packet

- Generated: ${JSON.stringify(invalidGeneratedAtResult.generatedAt)}
- Applicant: ${invalidGeneratedAtResult.decisions[0].applicantId}
- Decision: ${invalidGeneratedAtResult.decisions[0].decision}
- Reasons: ${invalidGeneratedAtResult.decisions[0].reasons.join(', ')}
- Remediation: ${invalidGeneratedAtResult.remediationActions[0].action}
- Audit digest: ${invalidGeneratedAtResult.auditDigest}

## Impossible Generated At Packet

- Generated: ${JSON.stringify(impossibleGeneratedAtResult.generatedAt)}
- Applicant: ${impossibleGeneratedAtResult.decisions[0].applicantId}
- Decision: ${impossibleGeneratedAtResult.decisions[0].decision}
- Reasons: ${impossibleGeneratedAtResult.decisions[0].reasons.join(', ')}
- Remediation: ${impossibleGeneratedAtResult.remediationActions[0].action}
- Audit digest: ${impossibleGeneratedAtResult.auditDigest}

## Malformed Applicant Entry Packet

- Applicant: ${malformedApplicantEntryResult.decisions[0].applicantId}
- Decision: ${malformedApplicantEntryResult.decisions[0].decision}
- Reasons: ${malformedApplicantEntryResult.decisions[0].reasons.join(', ')}
- Remediation: ${malformedApplicantEntryResult.remediationActions[0].action}
- Audit digest: ${malformedApplicantEntryResult.auditDigest}

## Blank Rejection Reason Packet

- Applicant: ${blankRejectionReasonResult.decisions[0].applicantId}
- Decision: ${blankRejectionReasonResult.decisions[0].decision}
- Reasons: ${blankRejectionReasonResult.decisions[0].reasons.join(', ')}
- Remediation: ${blankRejectionReasonResult.remediationActions[0].action}
- Audit digest: ${blankRejectionReasonResult.auditDigest}

## Impossible Appeal Window Packet

- Applicant: ${impossibleAppealWindowResult.decisions[0].applicantId}
- Decision: ${impossibleAppealWindowResult.decisions[0].decision}
- Appeal status: ${impossibleAppealWindowResult.decisions[0].appealStatus}
- Reasons: ${impossibleAppealWindowResult.decisions[0].reasons.join(', ')}
- Remediation: ${impossibleAppealWindowResult.remediationActions[0].action}
- Audit digest: ${impossibleAppealWindowResult.auditDigest}

## Safety

All fixtures are synthetic. The guard does not call payment processors, identity providers, private workspaces, sponsor systems, or external APIs.
`;

fs.writeFileSync(reportPath, markdown);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#102027"/>
  <rect x="54" y="58" width="1172" height="604" rx="16" fill="#17313a" stroke="#9bd67a" stroke-width="4"/>
  <text x="96" y="134" fill="#ffffff" font-family="Arial, sans-serif" font-size="42" font-weight="700">Challenge Prequalification Fairness Guard</text>
  <text x="96" y="208" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Accepted applicants: ${result.summary.accepted}</text>
  <text x="96" y="258" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Held for fairness review: ${result.summary.held}</text>
  <text x="96" y="308" fill="#dff5d5" font-family="Arial, sans-serif" font-size="28">Remediation actions: ${result.summary.remediationActions}</text>
  <text x="96" y="372" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">Checks: criteria, applicant identities, sponsor decisions, valid scores</text>
  <text x="96" y="410" fill="#ffffff" font-family="Arial, sans-serif" font-size="24">thresholds, anonymity, conflicts, appeals</text>
  <text x="96" y="478" fill="#ffd37a" font-family="Arial, sans-serif" font-size="26">Unfair screening decisions are held before applicants are accepted or rejected.</text>
  <text x="96" y="574" fill="#a6d7c3" font-family="Arial, sans-serif" font-size="18">${result.auditDigest}</text>
</svg>
`;

fs.writeFileSync(svgPath, svg);

console.log(`Wrote ${path.relative(__dirname, packetPath)}`);
console.log(`Wrote ${path.relative(__dirname, missingCriterionPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, normalizedCriterionPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, invalidScorePacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, invalidQuorumPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, invalidSponsorDecisionPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, missingApplicantIdentityPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, duplicateApplicantIdentityPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, missingReviewListPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedReviewEntryPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, missingCriteriaListPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedCriterionEntryPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, missingApplicantListPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedPrequalificationRoundPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, missingChallengeIdentityPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, invalidGeneratedAtPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, impossibleGeneratedAtPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, malformedApplicantEntryPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, blankRejectionReasonPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, impossibleAppealWindowPacketPath)}`);
console.log(`Wrote ${path.relative(__dirname, reportPath)}`);
console.log(`Wrote ${path.relative(__dirname, svgPath)}`);
console.log(`Accepted applicants: ${result.summary.accepted}`);
console.log(`Held applicants: ${result.summary.held}`);

function buildMissingCriterionIdRound() {
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
  return round;
}

function buildNormalizedCriterionIdRound() {
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
  return round;
}

function buildInvalidReviewerScoreRound() {
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
  return round;
}

function buildInvalidReviewerQuorumRound() {
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
  return round;
}

function buildInvalidSponsorDecisionRound() {
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
  return round;
}

function buildMissingApplicantIdentityRound() {
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
  return round;
}

function buildDuplicateApplicantIdentityRound() {
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
  return round;
}

function buildMissingReviewListRound() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-missing-review-list',
      sponsorDecision: 'accept',
      rejectionReasons: [],
      appealDueAt: null
    }
  ];
  delete round.reviews;
  return round;
}

function buildMalformedReviewEntryRound() {
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
  return round;
}

function buildMissingCriteriaListRound() {
  const round = buildSampleRound();
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
  delete round.criteria;
  return round;
}

function buildMalformedCriterionEntryRound() {
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
  return round;
}

function buildMissingApplicantListRound() {
  const round = buildSampleRound();
  delete round.applicants;
  return round;
}

function buildMissingChallengeIdentityRound() {
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
  return round;
}

function buildInvalidGeneratedAtRound() {
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
  return round;
}

function buildImpossibleGeneratedAtRound() {
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
  return round;
}

function buildMalformedApplicantEntryRound() {
  const round = buildSampleRound();
  round.applicants = [null];
  round.reviews = [];
  return round;
}

function buildBlankRejectionReasonRound() {
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
  return round;
}

function buildImpossibleAppealWindowRound() {
  const round = buildSampleRound();
  round.applicants = [
    {
      id: 'applicant-impossible-appeal',
      sponsorDecision: 'reject',
      rejectionReasons: ['insufficient validation plan'],
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
      rejectionReasons: ['insufficient validation plan'],
      scores: {
        'domain-fit': 58,
        'data-readiness': 60,
        'safety-plan': 62
      }
    },
    {
      applicantId: 'applicant-impossible-appeal',
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
  return round;
}
