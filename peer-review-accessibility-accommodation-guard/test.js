const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluatePeerReviewAccessibilityAccommodation,
  buildReviewerPacket,
} = require('./index');

test('holds reputation penalties when approved accommodations are not honored', () => {
  const result = evaluatePeerReviewAccessibilityAccommodation({
    reviewId: 'review-access-risk',
    generatedAt: '2026-05-23T08:30:00Z',
    reputationEvents: [
      {
        id: 'rev-late-visual',
        reviewerId: 'reviewer-alpha',
        mode: 'double-blind',
        discipline: 'computational-biology',
        status: 'submitted_late',
        proposedReputationDelta: -8,
        penaltyReason: 'late_review',
        accommodation: {
          requested: true,
          approved: true,
          types: ['screen_reader', 'extended_deadline'],
          requiredAccessibleArtifacts: ['manuscript_html', 'dataset_summary'],
          providedAccessibleArtifacts: ['manuscript_html'],
          originalDeadline: '2026-05-21T17:00:00Z',
          adjustedDeadline: null,
        },
        submittedAt: '2026-05-22T10:00:00Z',
      },
    ],
  });

  assert.equal(result.decision, 'hold-for-accessibility-review');
  assert.equal(result.summary.eventsReviewed, 1);
  assert.equal(result.summary.penaltiesHeld, 1);
  assert.equal(result.summary.missingAccessibleArtifacts, 1);
  assert.equal(result.summary.deadlineIssues, 1);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['missing-accessible-artifact', 'missing-adjusted-deadline', 'unfair-reputation-penalty']
  );
  assert.equal(result.requiredActions[0].type, 'publish_accessible_artifact');
});

test('redacts accommodation details before anonymous or double-blind reputation updates', () => {
  const result = evaluatePeerReviewAccessibilityAccommodation({
    reviewId: 'review-privacy-risk',
    generatedAt: '2026-05-23T08:30:00Z',
    reputationEvents: [
      {
        id: 'rev-privacy',
        reviewerId: 'reviewer-beta',
        mode: 'anonymous',
        discipline: 'social-science',
        status: 'submitted_on_time',
        proposedReputationDelta: 6,
        accommodation: {
          requested: true,
          approved: true,
          types: ['medical_leave'],
          providedAccessibleArtifacts: ['manuscript_html'],
          requiredAccessibleArtifacts: ['manuscript_html'],
          disclosureText: 'Reviewer disclosed migraine treatment schedule and local clinic details.',
          disclosureVisibleToAuthors: true,
        },
      },
    ],
  });

  assert.equal(result.decision, 'needs-steward-review');
  assert.equal(result.summary.privacyHolds, 1);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['unsafe-accommodation-disclosure']
  );
  assert.equal(result.requiredActions[0].type, 'redact_accommodation_disclosure');
});

test('protects reviewers from service-credit loss when timezone or translation windows are missing', () => {
  const result = evaluatePeerReviewAccessibilityAccommodation({
    reviewId: 'review-l10n-risk',
    generatedAt: '2026-05-23T08:30:00Z',
    reputationEvents: [
      {
        id: 'rev-translation',
        reviewerId: 'reviewer-gamma',
        mode: 'public',
        discipline: 'physics',
        status: 'declined',
        proposedReputationDelta: -4,
        penaltyReason: 'declined_assignment',
        accommodation: {
          requested: false,
          approved: false,
          types: [],
          providedAccessibleArtifacts: ['manuscript_pdf'],
          requiredAccessibleArtifacts: ['manuscript_pdf'],
        },
        localeSupport: {
          reviewerTimezone: 'Asia/Bangkok',
          invitationSentAt: '2026-05-20T23:30:00Z',
          responseDeadline: '2026-05-21T02:30:00Z',
          minimumLocalHours: 24,
          translatedAbstractProvided: false,
          requiredLanguage: 'vi',
        },
      },
    ],
  });

  assert.equal(result.decision, 'hold-for-accessibility-review');
  assert.equal(result.summary.penaltiesHeld, 1);
  assert.equal(result.summary.localeWindowIssues, 2);
  assert.deepEqual(
    result.findings.map((finding) => finding.type),
    ['insufficient-local-response-window', 'missing-translation-support', 'unfair-reputation-penalty']
  );
  assert.equal(result.requiredActions.at(-1).type, 'freeze_reputation_penalty');
});

test('approves fair events and builds deterministic reviewer packet', () => {
  const result = evaluatePeerReviewAccessibilityAccommodation({
    reviewId: 'review-access-ready',
    generatedAt: '2026-05-23T08:30:00Z',
    reputationEvents: [
      {
        id: 'rev-clean',
        reviewerId: 'reviewer-delta',
        mode: 'semi-private',
        discipline: 'biology',
        status: 'submitted_on_time',
        proposedReputationDelta: 7,
        accommodation: {
          requested: true,
          approved: true,
          types: ['screen_reader', 'extended_deadline'],
          requiredAccessibleArtifacts: ['manuscript_html', 'dataset_summary'],
          providedAccessibleArtifacts: ['manuscript_html', 'dataset_summary'],
          originalDeadline: '2026-05-21T17:00:00Z',
          adjustedDeadline: '2026-05-24T17:00:00Z',
          disclosureText: 'Accessibility accommodation approved.',
          disclosureVisibleToAuthors: false,
        },
        localeSupport: {
          reviewerTimezone: 'Asia/Bangkok',
          invitationSentAt: '2026-05-20T08:00:00Z',
          responseDeadline: '2026-05-22T08:00:00Z',
          minimumLocalHours: 24,
          translatedAbstractProvided: true,
          requiredLanguage: 'en',
        },
      },
    ],
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.fairnessScore, 100);
  assert.equal(result.findings.length, 0);

  const packet = buildReviewerPacket(result);
  assert.match(packet, /# Peer Review Accessibility Accommodation Guard Report/);
  assert.match(packet, /Review packet: review-access-ready/);
  assert.match(packet, /Decision: approved/);
  assert.match(packet, /Fairness score: 100/);
  assert.match(packet, /Findings: 0/);
});
