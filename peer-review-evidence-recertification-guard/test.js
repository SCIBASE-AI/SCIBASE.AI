const assert = require('assert');
const {
  evaluateRecertification,
  buildSampleProject
} = require('./index');

function byId(items, id) {
  return items.find((item) => item.id === id);
}

function testStaleReviewsFreezeReputationUntilRecertified() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);
  const review = byId(result.reviewDecisions, 'review-dataset-methods');

  assert.equal(review.status, 'recertification-required');
  assert.deepEqual(review.reasons, [
    'artifact-digest-changed',
    'artifact-updated-after-review'
  ]);

  const action = byId(result.reputationActions, 'review-dataset-methods');
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.originalDelta, 18);
  assert.equal(action.effectiveDelta, 0);
  assert.equal(action.appliesTo, 'reviewer:orcid:0000-0002-reviewer-a');

  assert.equal(result.summary.staleReviews, 3);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testCurrentOrRecertifiedReviewsKeepReputationCredit() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);
  const methods = byId(result.reviewDecisions, 'review-notebook-methods');
  const code = byId(result.reviewDecisions, 'review-code-recertified');

  assert.equal(methods.status, 'current');
  assert.equal(code.status, 'current');

  const codeAction = byId(result.reputationActions, 'review-code-recertified');
  assert.equal(codeAction.action, 'apply-current-delta');
  assert.equal(codeAction.effectiveDelta, 14);
}

function testAnonymousReviewerIdentityIsRedacted() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);
  const task = byId(result.recertificationTasks, 'recertify-review-blind-data');
  const timelineEvent = result.timelinePacket.events.find((event) => event.reviewId === 'review-blind-data');

  assert.equal(task.reviewer, 'anonymous-reviewer-7');
  assert.ok(!JSON.stringify(task).includes('orcid:0000-0002-private'));
  assert.equal(timelineEvent.reviewer, 'anonymous-reviewer-7');
  assert.ok(!JSON.stringify(timelineEvent).includes('orcid:0000-0002-private'));
}

function testAnonymousLabelWithDirectIdentifierIsNotEchoed() {
  const project = buildSampleProject();
  project.reviews = [
    {
      id: 'review-blind-direct-label',
      reviewerId: 'orcid:0000-0002-private-label',
      anonymousLabel: 'alice.private@example.edu',
      mode: 'double-blind',
      artifactId: 'dataset-cohort-table',
      evidenceDigest: 'sha256:dataset-v1',
      submittedAt: '2026-05-18T09:00:00Z',
      reputationDelta: 18
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const task = byId(result.recertificationTasks, 'recertify-review-blind-direct-label');
  const timelineEvent = result.timelinePacket.events.find(
    (event) => event.reviewId === 'review-blind-direct-label'
  );

  assert.equal(task.reviewer, 'anonymous-reviewer');
  assert.equal(timelineEvent.reviewer, 'anonymous-reviewer');
  assert.ok(!JSON.stringify(result).includes('alice.private@example.edu'));
  assert.ok(!JSON.stringify(result).includes('orcid:0000-0002-private-label'));
}

function testBlindModeRedactionAcceptsCaseAndSeparatorVariants() {
  const project = buildSampleProject();
  project.reviews = [
    {
      id: 'review-blind-variant',
      reviewerId: 'orcid:0000-0002-variant-private',
      anonymousLabel: 'anonymous-reviewer-variant',
      mode: 'Double_Blind',
      artifactId: 'dataset-cohort-table',
      evidenceDigest: 'sha256:dataset-v1',
      submittedAt: '2026-05-18T09:00:00Z',
      reputationDelta: 18
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const task = byId(result.recertificationTasks, 'recertify-review-blind-variant');
  const timelineEvent = result.timelinePacket.events.find(
    (event) => event.reviewId === 'review-blind-variant'
  );

  assert.equal(task.reviewer, 'anonymous-reviewer-variant');
  assert.equal(timelineEvent.reviewer, 'anonymous-reviewer-variant');
  assert.ok(!JSON.stringify(result).includes('orcid:0000-0002-variant-private'));
}

function testBlindModeRedactionAcceptsSpaceSeparatedModes() {
  const project = buildSampleProject();
  project.reviews = [
    {
      id: 'review-space-blind',
      reviewerId: 'orcid:0000-0002-space-private',
      anonymousLabel: 'anonymous-reviewer-space',
      mode: 'Double Blind',
      artifactId: 'dataset-cohort-table',
      evidenceDigest: 'sha256:dataset-v1',
      submittedAt: '2026-05-18T09:00:00Z',
      reputationDelta: 18
    }
  ];
  project.inlineComments = [
    {
      id: 'comment-space-anonymous',
      reviewerId: 'orcid:0000-0002-comment-private',
      anonymousLabel: 'anonymous-commenter-space',
      mode: 'Fully Anonymous',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v2',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const reviewTask = byId(result.recertificationTasks, 'recertify-review-space-blind');
  const commentTask = byId(result.recertificationTasks, 'recertify-comment-space-anonymous');

  assert.equal(reviewTask.reviewer, 'anonymous-reviewer-space');
  assert.equal(commentTask.reviewer, 'anonymous-commenter-space');
  assert.ok(!JSON.stringify(result).includes('orcid:0000-0002-space-private'));
  assert.ok(!JSON.stringify(result).includes('orcid:0000-0002-comment-private'));
}

function testInlineCommentsUseArtifactAnchorsForRecertification() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-code-line-41');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, [
    'artifact-digest-changed',
    'artifact-updated-after-comment',
    'anchor-line-shifted-after-comment'
  ]);

  const task = byId(result.recertificationTasks, 'recertify-comment-code-line-41');
  assert.equal(task.kind, 'inline-comment');
  assert.equal(task.priority, 'normal');
}

function testInlineCommentDigestChangeStalesAnchorEvenWithoutLineShift() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v4',
      changedAt: '2026-05-20T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-same-line-changed-digest',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-same-line-changed-digest');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, [
    'artifact-digest-changed',
    'artifact-updated-after-comment'
  ]);
}

function testArtifactUpdatedAfterInlineCommentRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-20T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-after-artifact-update',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-after-artifact-update');
  const task = byId(result.recertificationTasks, 'recertify-comment-after-artifact-update');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, ['artifact-updated-after-comment']);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['artifact-updated-after-comment']);
}

function testInvalidInlineCommentTimestampRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-invalid-submitted-at',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: 'not-a-date'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-invalid-submitted-at');
  const task = byId(result.recertificationTasks, 'recertify-comment-invalid-submitted-at');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, ['invalid-comment-timestamp']);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['invalid-comment-timestamp']);
}

function testMissingInlineCommentTimestampRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-missing-submitted-at',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: null
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-missing-submitted-at');
  const task = byId(result.recertificationTasks, 'recertify-comment-missing-submitted-at');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, ['invalid-comment-timestamp']);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['invalid-comment-timestamp']);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testMissingInlineCommentAnchorMetadataRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-missing-anchor-metadata',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-missing-anchor-metadata');
  const task = byId(result.recertificationTasks, 'recertify-comment-missing-anchor-metadata');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'missing');
  assert.deepEqual(comment.reasons, ['comment-anchor-metadata-missing']);
  assert.equal(comment.anchor, null);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['comment-anchor-metadata-missing']);
}

function testMissingArtifactAnchorMapRequiresCommentRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z'
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-missing-artifact-anchor-map',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-missing-artifact-anchor-map');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'missing');
  assert.deepEqual(comment.reasons, ['anchor-missing-after-comment']);
}

function testStaleInlineCommentsBlockReputationUpdateWithoutStaleReviews() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v4',
      changedAt: '2026-05-20T09:30:00Z',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-only-stale-evidence',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);

  assert.equal(result.summary.staleReviews, 0);
  assert.equal(result.summary.staleComments, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
  assert.equal(byId(result.recertificationTasks, 'recertify-comment-only-stale-evidence').kind, 'inline-comment');
}

function testInvalidReviewTimestampRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-invalid-recertified-at',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      recertifiedAt: 'not-a-date',
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-invalid-recertified-at');
  const action = byId(result.reputationActions, 'review-invalid-recertified-at');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['invalid-review-timestamp']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
}

function testMissingReviewTimestampRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-19T09:30:00Z',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-missing-submitted-at',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: null,
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-missing-submitted-at');
  const task = byId(result.recertificationTasks, 'recertify-review-missing-submitted-at');
  const action = byId(result.reputationActions, 'review-missing-submitted-at');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['invalid-review-timestamp']);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['invalid-review-timestamp']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
}

function testReviewRecertificationBeforeSubmissionRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-14T09:30:00Z',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-backdated-recertification',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      recertifiedAt: '2026-05-15T11:00:00Z',
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-backdated-recertification');
  const task = byId(result.recertificationTasks, 'recertify-review-backdated-recertification');
  const action = byId(result.reputationActions, 'review-backdated-recertification');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['recertification-before-submission']);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['recertification-before-submission']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
}

function testPublicReviewWithoutReviewerIdentityFreezesReputation() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-10T10:00:00Z',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-missing-public-reviewer',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      reputationDelta: 12
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-missing-public-reviewer');
  const task = byId(result.recertificationTasks, 'recertify-review-missing-public-reviewer');
  const action = byId(result.reputationActions, 'review-missing-public-reviewer');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['reviewer-identity-missing']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
  assert.notEqual(action.appliesTo, 'reviewer:undefined');
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['reviewer-identity-missing']);
}

function testInvalidReputationDeltaRequiresRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-10T10:00:00Z',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-invalid-reputation-delta',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      reputationDelta: '18'
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-invalid-reputation-delta');
  const task = byId(result.recertificationTasks, 'recertify-review-invalid-reputation-delta');
  const action = byId(result.reputationActions, 'review-invalid-reputation-delta');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['invalid-reputation-delta']);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['invalid-reputation-delta']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.originalDelta, 0);
  assert.equal(action.effectiveDelta, 0);
  assert.equal(result.summary.frozenReputationDelta, 0);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testInvalidArtifactTimestampRequiresReviewRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: 'not-a-date',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-invalid-artifact-timestamp',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-invalid-artifact-timestamp');
  const task = byId(result.recertificationTasks, 'recertify-review-invalid-artifact-timestamp');
  const action = byId(result.reputationActions, 'review-invalid-artifact-timestamp');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['invalid-artifact-timestamp']);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['invalid-artifact-timestamp']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
}

function testMissingArtifactTimestampRequiresReviewRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: null,
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-missing-artifact-timestamp',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-missing-artifact-timestamp');
  const task = byId(result.recertificationTasks, 'recertify-review-missing-artifact-timestamp');
  const action = byId(result.reputationActions, 'review-missing-artifact-timestamp');

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['invalid-artifact-timestamp']);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['invalid-artifact-timestamp']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
}

function testInvalidArtifactTimestampRequiresCommentRecertification() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: 'not-a-date',
      currentAnchors: {
        'src/analyze.py#L41': { line: 41 }
      }
    }
  ];
  project.reviews = [];
  project.inlineComments = [
    {
      id: 'comment-invalid-artifact-timestamp',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      mode: 'public',
      artifactId: 'analysis-code',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  ];

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'comment-invalid-artifact-timestamp');
  const task = byId(result.recertificationTasks, 'recertify-comment-invalid-artifact-timestamp');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'stale');
  assert.deepEqual(comment.reasons, ['invalid-artifact-timestamp']);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['invalid-artifact-timestamp']);
  assert.equal(result.summary.staleComments, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testTimelinePacketPreservesAuditEvidenceWithoutRawPrivateProfiles() {
  const project = buildSampleProject();
  const result = evaluateRecertification(project);

  assert.equal(result.timelinePacket.projectId, 'project-alpha-replication');
  assert.equal(result.timelinePacket.events.length, 6);
  assert.ok(result.timelinePacket.auditDigest.startsWith('sha256:'));
  assert.ok(!JSON.stringify(result.timelinePacket).includes('private@'));
}

function testMissingReviewAndCommentListsEvaluateAsEmptyEvidence() {
  const project = {
    projectId: 'project-empty-reputation-evidence',
    asOf: '2026-05-30T12:00:00Z',
    artifacts: []
  };

  const result = evaluateRecertification(project);

  assert.deepEqual(result.reviewDecisions, []);
  assert.deepEqual(result.commentDecisions, []);
  assert.deepEqual(result.reputationActions, []);
  assert.deepEqual(result.recertificationTasks, []);
  assert.equal(result.summary.totalReviews, 0);
  assert.equal(result.summary.staleReviews, 0);
  assert.equal(result.summary.staleComments, 0);
  assert.equal(result.summary.frozenReputationDelta, 0);
  assert.equal(result.summary.recommendedAction, 'allow-reputation-update');
  assert.equal(result.timelinePacket.events.length, 0);
}

function testMalformedReviewListRequiresRecertificationInsteadOfAllowingUpdate() {
  const project = {
    projectId: 'project-malformed-review-list',
    asOf: '2026-05-30T12:05:00Z',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      }
    ],
    reviews: {
      id: 'review-object-instead-of-array',
      artifactId: 'analysis-code',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      submittedAt: '2026-05-16T11:00:00Z',
      evidenceDigest: 'sha256:code-v3',
      reputationDelta: 14
    },
    inlineComments: []
  };

  const result = evaluateRecertification(project);
  const review = byId(result.reviewDecisions, 'malformed-review-list');
  const task = byId(result.recertificationTasks, 'recertify-malformed-review-list');
  const action = byId(result.reputationActions, 'malformed-review-list');

  assert.ok(review, 'expected malformed review collection to create a review decision');
  assert.ok(task, 'expected malformed review collection to create a recertification task');
  assert.ok(action, 'expected malformed review collection to freeze reputation updates');
  assert.equal(review.status, 'recertification-required');
  assert.deepEqual(review.reasons, ['malformed-review-list']);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['malformed-review-list']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(result.summary.staleReviews, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testMalformedInlineCommentListRequiresRecertificationInsteadOfAllowingUpdate() {
  const project = {
    projectId: 'project-malformed-inline-comment-list',
    asOf: '2026-05-30T12:08:00Z',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      }
    ],
    reviews: [],
    inlineComments: {
      id: 'comment-object-instead-of-array',
      artifactId: 'analysis-code',
      reviewerId: 'orcid:0000-0002-reviewer-b',
      anchorDigest: 'sha256:code-v3',
      anchor: {
        selector: 'src/analyze.py#L41',
        line: 41
      },
      submittedAt: '2026-05-18T14:30:00Z'
    }
  };

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'malformed-inline-comment-list');
  const task = byId(result.recertificationTasks, 'recertify-malformed-inline-comment-list');

  assert.ok(comment, 'expected malformed inline comment collection to create a comment decision');
  assert.ok(task, 'expected malformed inline comment collection to create a recertification task');
  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'missing');
  assert.deepEqual(comment.reasons, ['malformed-inline-comment-list']);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['malformed-inline-comment-list']);
  assert.equal(result.summary.staleComments, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testMissingArtifactListRequiresRecertificationInsteadOfCrashing() {
  const project = {
    projectId: 'project-missing-artifact-list',
    asOf: '2026-05-30T12:10:00Z',
    reviews: [
      {
        id: 'review-without-artifact-list',
        artifactId: 'supplementary-methods',
        mode: 'public',
        reviewerId: 'orcid:0000-0002-9999-8888',
        submittedAt: '2026-05-29T09:00:00Z',
        evidenceDigest: 'sha256:methods-v1',
        reputationDelta: 9
      }
    ],
    inlineComments: []
  };

  const result = evaluateRecertification(project);
  const review = byId(result.reviewDecisions, 'review-without-artifact-list');
  const action = byId(result.reputationActions, 'review-without-artifact-list');
  const task = byId(result.recertificationTasks, 'recertify-review-without-artifact-list');

  assert.equal(review.status, 'recertification-required');
  assert.deepEqual(review.reasons, ['artifact-missing']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['artifact-missing']);
  assert.equal(result.summary.staleReviews, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testMalformedReviewEntriesRequireRecertificationInsteadOfCrashing() {
  const project = {
    projectId: 'project-malformed-review-entry',
    asOf: '2026-05-30T12:20:00Z',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      }
    ],
    reviews: [null],
    inlineComments: []
  };

  const result = evaluateRecertification(project);
  const review = byId(result.reviewDecisions, 'malformed-review-entry-1');
  const action = byId(result.reputationActions, 'malformed-review-entry-1');
  const task = byId(result.recertificationTasks, 'recertify-malformed-review-entry-1');

  assert.equal(review.status, 'recertification-required');
  assert.deepEqual(review.reasons, ['malformed-review-entry']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['malformed-review-entry']);
  assert.equal(result.summary.staleReviews, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testMalformedInlineCommentEntriesRequireRecertificationInsteadOfCrashing() {
  const project = {
    projectId: 'project-malformed-inline-comment-entry',
    asOf: '2026-05-30T12:25:00Z',
    artifacts: [
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      }
    ],
    reviews: [],
    inlineComments: [null]
  };

  const result = evaluateRecertification(project);
  const comment = byId(result.commentDecisions, 'malformed-inline-comment-entry-1');
  const task = byId(result.recertificationTasks, 'recertify-malformed-inline-comment-entry-1');

  assert.equal(comment.status, 'recertification-required');
  assert.equal(comment.anchorStatus, 'missing');
  assert.deepEqual(comment.reasons, ['malformed-inline-comment-entry']);
  assert.equal(task.kind, 'inline-comment');
  assert.deepEqual(task.reasons, ['malformed-inline-comment-entry']);
  assert.equal(result.summary.staleComments, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testMalformedProjectPacketRequiresRecertificationInsteadOfCrashing() {
  const result = evaluateRecertification(null);
  const review = byId(result.reviewDecisions, 'malformed-project-evidence');
  const task = byId(result.recertificationTasks, 'recertify-malformed-project-evidence');
  const action = byId(result.reputationActions, 'malformed-project-evidence');

  assert.equal(result.projectId, 'unidentified-project');
  assert.equal(result.generatedAt, null);
  assert.equal(review.status, 'recertification-required');
  assert.deepEqual(review.reasons, ['malformed-project-evidence']);
  assert.equal(task.kind, 'peer-review');
  assert.deepEqual(task.reasons, ['malformed-project-evidence']);
  assert.equal(action.action, 'freeze-until-recertified');
  assert.equal(action.effectiveDelta, 0);
  assert.equal(result.summary.staleReviews, 1);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testInvalidProjectTimestampBlocksReputationUpdate() {
  const project = buildSampleProject();
  project.asOf = 'not-a-date';
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-10T10:00:00Z',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-current-with-invalid-project-time',
      reviewerId: 'orcid:0000-0002-reviewer-c',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const task = byId(result.recertificationTasks, 'recertify-project-timestamp');

  assert.equal(result.timelinePacket.generatedAt, null);
  assert.ok(task, 'expected invalid project timestamp to create a recertification task');
  assert.equal(task.kind, 'project-evidence');
  assert.deepEqual(task.reasons, ['invalid-project-timestamp']);
  assert.equal(result.summary.recommendedAction, 'block-reputation-update');
}

function testPublicReviewerDirectIdentifierRequiresRecertificationWithoutEchoingId() {
  const project = buildSampleProject();
  project.artifacts = [
    {
      id: 'analysis-code',
      type: 'code',
      currentDigest: 'sha256:code-v3',
      changedAt: '2026-05-10T10:00:00Z',
      currentAnchors: {}
    }
  ];
  project.reviews = [
    {
      id: 'review-public-email-identity',
      reviewerId: 'alice.private@example.edu',
      mode: 'public',
      artifactId: 'analysis-code',
      evidenceDigest: 'sha256:code-v3',
      submittedAt: '2026-05-16T11:00:00Z',
      reputationDelta: 14
    }
  ];
  project.inlineComments = [];

  const result = evaluateRecertification(project);
  const decision = byId(result.reviewDecisions, 'review-public-email-identity');
  const task = byId(result.recertificationTasks, 'recertify-review-public-email-identity');
  const action = byId(result.reputationActions, 'review-public-email-identity');
  const packetJson = JSON.stringify(result);

  assert.equal(decision.status, 'recertification-required');
  assert.deepEqual(decision.reasons, ['reviewer-identity-unsafe']);
  assert.equal(task.reviewer, 'reviewer:unverified');
  assert.equal(action.appliesTo, 'reviewer:unverified');
  assert.equal(packetJson.includes('alice.private@example.edu'), false);
}

const tests = [
  testStaleReviewsFreezeReputationUntilRecertified,
  testCurrentOrRecertifiedReviewsKeepReputationCredit,
  testAnonymousReviewerIdentityIsRedacted,
  testAnonymousLabelWithDirectIdentifierIsNotEchoed,
  testBlindModeRedactionAcceptsCaseAndSeparatorVariants,
  testBlindModeRedactionAcceptsSpaceSeparatedModes,
  testInlineCommentsUseArtifactAnchorsForRecertification,
  testInlineCommentDigestChangeStalesAnchorEvenWithoutLineShift,
  testArtifactUpdatedAfterInlineCommentRequiresRecertification,
  testInvalidInlineCommentTimestampRequiresRecertification,
  testMissingInlineCommentTimestampRequiresRecertification,
  testMissingInlineCommentAnchorMetadataRequiresRecertification,
  testMissingArtifactAnchorMapRequiresCommentRecertification,
  testStaleInlineCommentsBlockReputationUpdateWithoutStaleReviews,
  testInvalidReviewTimestampRequiresRecertification,
  testMissingReviewTimestampRequiresRecertification,
  testReviewRecertificationBeforeSubmissionRequiresRecertification,
  testPublicReviewWithoutReviewerIdentityFreezesReputation,
  testInvalidReputationDeltaRequiresRecertification,
  testInvalidArtifactTimestampRequiresReviewRecertification,
  testMissingArtifactTimestampRequiresReviewRecertification,
  testInvalidArtifactTimestampRequiresCommentRecertification,
  testTimelinePacketPreservesAuditEvidenceWithoutRawPrivateProfiles,
  testMissingReviewAndCommentListsEvaluateAsEmptyEvidence,
  testMalformedReviewListRequiresRecertificationInsteadOfAllowingUpdate,
  testMalformedInlineCommentListRequiresRecertificationInsteadOfAllowingUpdate,
  testMissingArtifactListRequiresRecertificationInsteadOfCrashing,
  testMalformedReviewEntriesRequireRecertificationInsteadOfCrashing,
  testMalformedInlineCommentEntriesRequireRecertificationInsteadOfCrashing,
  testMalformedProjectPacketRequiresRecertificationInsteadOfCrashing,
  testInvalidProjectTimestampBlocksReputationUpdate,
  testPublicReviewerDirectIdentifierRequiresRecertificationWithoutEchoingId
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} peer review evidence recertification tests passed`);
