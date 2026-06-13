const crypto = require('crypto');

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function isoTime(value) {
  return new Date(value).getTime();
}

function hasValidTime(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  return Number.isFinite(isoTime(value));
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasValidReputationDelta(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function reputationDeltaFor(review) {
  return hasValidReputationDelta(review.reputationDelta) ? review.reputationDelta : 0;
}

function normalizeReviewMode(mode) {
  return String(mode || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function isBlindOrAnonymous(mode) {
  return ['anonymous', 'blind', 'double-blind', 'fully-anonymous'].includes(normalizeReviewMode(mode));
}

function reviewerDisplay(item) {
  if (isBlindOrAnonymous(item.mode)) {
    return safeAnonymousLabel(item.anonymousLabel);
  }

  if (containsUnsafePublicReviewerIdentifier(item.reviewerId)) {
    return 'reviewer:unverified';
  }

  return hasText(item.reviewerId) ? `reviewer:${item.reviewerId.trim()}` : 'reviewer:unverified';
}

function safeAnonymousLabel(label) {
  if (!hasText(label)) return 'anonymous-reviewer';
  const trimmed = label.trim();
  return containsDirectIdentifier(trimmed) ? 'anonymous-reviewer' : trimmed;
}

function containsDirectIdentifier(value = '') {
  return /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|orcid:\d{4}-\d{4}-\d{4}-\d{3}[\dx]|private/i.test(value);
}

function containsUnsafePublicReviewerIdentifier(value = '') {
  return /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:file:\/\/|[A-Z]:[\\/]Users[\\/][^ \s"')]+|\/Users\/[^ \s"')]+|\/home\/[^ \s"')]+|private-lab|patient-export)/i.test(value);
}

function evidenceList(value) {
  return Array.isArray(value) ? value : [];
}

function evidenceRecords(value) {
  return evidenceList(value).filter(isRecord);
}

function normalizeReviewEntries(value) {
  const reviews = Array.isArray(value)
    ? value
    : value == null
      ? []
      : [
        {
          id: 'malformed-review-list',
          artifactId: null,
          mode: null,
          reputationDelta: null,
          malformedReason: 'malformed-review-list',
          __malformedReviewEntry: true
        }
      ];

  return reviews.map((review, index) => {
    if (isRecord(review)) {
      return review;
    }

    return {
      id: `malformed-review-entry-${index + 1}`,
      artifactId: null,
      mode: null,
      reputationDelta: null,
      malformedReason: 'malformed-review-entry',
      __malformedReviewEntry: true
    };
  });
}

function normalizeInlineCommentEntries(value) {
  const comments = Array.isArray(value)
    ? value
    : value == null
      ? []
      : [
        {
          id: 'malformed-inline-comment-list',
          artifactId: null,
          mode: null,
          malformedReason: 'malformed-inline-comment-list',
          __malformedInlineCommentEntry: true
        }
      ];

  return comments.map((comment, index) => {
    if (isRecord(comment)) {
      return comment;
    }

    return {
      id: `malformed-inline-comment-entry-${index + 1}`,
      artifactId: null,
      mode: null,
      malformedReason: 'malformed-inline-comment-entry',
      __malformedInlineCommentEntry: true
    };
  });
}

function normalizeProject(project) {
  if (isRecord(project)) {
    return project;
  }

  return {
    projectId: 'unidentified-project',
    asOf: null,
    artifacts: [],
    reviews: [
      {
        id: 'malformed-project-evidence',
        artifactId: null,
        mode: null,
        reputationDelta: null,
        malformedReason: 'malformed-project-evidence',
        __malformedReviewEntry: true
      }
    ],
    inlineComments: []
  };
}

function findArtifact(project, artifactId) {
  return evidenceRecords(project.artifacts).find((artifact) => artifact.id === artifactId);
}

function evaluateReview(project, review) {
  if (review.__malformedReviewEntry) {
    return {
      id: review.id,
      artifactId: null,
      mode: null,
      reviewer: reviewerDisplay(review),
      status: 'recertification-required',
      reasons: [review.malformedReason || 'malformed-review-entry'],
      submittedAt: null,
      recertifiedAt: null,
      evidenceDigest: null,
      currentArtifactDigest: null
    };
  }

  const artifact = findArtifact(project, review.artifactId);
  const reasons = [];
  const reviewTime = review.recertifiedAt || review.submittedAt;
  const reviewTimeIsValid = hasValidTime(reviewTime);
  const submittedAtIsValid = hasValidTime(review.submittedAt);
  const recertifiedAtIsValid = hasValidTime(review.recertifiedAt);
  const reviewedAt = reviewTimeIsValid ? isoTime(reviewTime) : null;

  if (!reviewTimeIsValid) {
    reasons.push('invalid-review-timestamp');
  }

  if (recertifiedAtIsValid && submittedAtIsValid && isoTime(review.recertifiedAt) < isoTime(review.submittedAt)) {
    reasons.push('recertification-before-submission');
  }

  if (!isBlindOrAnonymous(review.mode) && !hasText(review.reviewerId)) {
    reasons.push('reviewer-identity-missing');
  }

  if (!isBlindOrAnonymous(review.mode) && containsUnsafePublicReviewerIdentifier(review.reviewerId)) {
    reasons.push('reviewer-identity-unsafe');
  }

  if (!hasValidReputationDelta(review.reputationDelta)) {
    reasons.push('invalid-reputation-delta');
  }

  if (!artifact) {
    reasons.push('artifact-missing');
  } else {
    if (!hasValidTime(artifact.changedAt)) {
      reasons.push('invalid-artifact-timestamp');
    }

    if (artifact.currentDigest !== review.evidenceDigest) {
      reasons.push('artifact-digest-changed');
    }

    if (reviewTimeIsValid && hasValidTime(artifact.changedAt) && isoTime(artifact.changedAt) > reviewedAt) {
      reasons.push('artifact-updated-after-review');
    }
  }

  const status = reasons.length > 0 ? 'recertification-required' : 'current';
  const displayReviewer = reviewerDisplay(review);

  return {
    id: review.id,
    artifactId: review.artifactId,
    mode: review.mode,
    reviewer: displayReviewer,
    status,
    reasons,
    submittedAt: review.submittedAt,
    recertifiedAt: review.recertifiedAt || null,
    evidenceDigest: review.evidenceDigest,
    currentArtifactDigest: artifact ? artifact.currentDigest : null
  };
}

function reputationActionForReview(review, decision) {
  const base = {
    id: review.id,
    appliesTo: reviewerDisplay(review),
    originalDelta: reputationDeltaFor(review),
    reasonDigest: digest({
      reviewId: review.id,
      reasons: decision.reasons,
      evidenceDigest: review.evidenceDigest,
      currentArtifactDigest: decision.currentArtifactDigest
    })
  };

  if (decision.status === 'current') {
    return {
      ...base,
      action: 'apply-current-delta',
      effectiveDelta: reputationDeltaFor(review)
    };
  }

  return {
    ...base,
    action: 'freeze-until-recertified',
    effectiveDelta: 0
  };
}

function taskForReview(review, decision) {
  if (decision.status === 'current') {
    return null;
  }

  return {
    id: `recertify-${review.id}`,
    kind: 'peer-review',
    reviewId: review.id,
    artifactId: review.artifactId,
    reviewer: decision.reviewer,
    priority: Math.abs(reputationDeltaFor(review)) >= 15 ? 'high' : 'normal',
    requiredAction: 'confirm-review-still-applies-to-current-artifact',
    blockedProfileUpdates: ['reputation-score', 'leaderboards', 'badges'],
    reasons: decision.reasons
  };
}

function evaluateComment(project, comment) {
  if (comment.__malformedInlineCommentEntry) {
    return {
      id: comment.id,
      artifactId: null,
      status: 'recertification-required',
      anchorStatus: 'missing',
      reviewer: reviewerDisplay(comment),
      reasons: [comment.malformedReason || 'malformed-inline-comment-entry'],
      anchor: null
    };
  }

  const artifact = findArtifact(project, comment.artifactId);
  const reasons = [];
  let anchorStatus = 'current';
  const commentTimeIsValid = hasValidTime(comment.submittedAt);
  const commentedAt = commentTimeIsValid ? isoTime(comment.submittedAt) : null;
  const markStale = () => {
    if (anchorStatus !== 'missing') {
      anchorStatus = 'stale';
    }
  };
  const hasUsableAnchor = comment.anchor
    && typeof comment.anchor.selector === 'string'
    && typeof comment.anchor.line === 'number';

  if (!commentTimeIsValid) {
    reasons.push('invalid-comment-timestamp');
    markStale();
  }

  if (!hasUsableAnchor) {
    reasons.push('comment-anchor-metadata-missing');
    anchorStatus = 'missing';
  }

  if (!artifact) {
    reasons.push('artifact-missing');
    anchorStatus = 'missing';
  } else {
    if (!hasValidTime(artifact.changedAt)) {
      reasons.push('invalid-artifact-timestamp');
      markStale();
    }

    if (artifact.currentDigest !== comment.anchorDigest) {
      reasons.push('artifact-digest-changed');
      markStale();
    }

    if (hasUsableAnchor) {
      const currentAnchor = (artifact.currentAnchors || {})[comment.anchor.selector];
      if (!currentAnchor) {
        reasons.push('anchor-missing-after-comment');
        anchorStatus = 'missing';
      } else {
        if (
          commentTimeIsValid
          && hasValidTime(artifact.changedAt)
          && isoTime(artifact.changedAt) > commentedAt
        ) {
          reasons.push('artifact-updated-after-comment');
          markStale();
        }

        if (currentAnchor.line !== comment.anchor.line) {
          reasons.push('anchor-line-shifted-after-comment');
          markStale();
        }
      }
    }
  }

  const status = reasons.length > 0 ? 'recertification-required' : 'current';

  return {
    id: comment.id,
    artifactId: comment.artifactId,
    status,
    anchorStatus,
    reviewer: reviewerDisplay(comment),
    reasons,
    anchor: comment.anchor || null
  };
}

function taskForComment(comment, decision) {
  if (decision.status === 'current') {
    return null;
  }

  return {
    id: `recertify-${comment.id}`,
    kind: 'inline-comment',
    commentId: comment.id,
    artifactId: comment.artifactId,
    reviewer: decision.reviewer,
    priority: 'normal',
    requiredAction: 'confirm-comment-anchor-still-matches-current-artifact',
    reasons: decision.reasons
  };
}

function taskForProjectTimestamp(project, projectIssues) {
  if (projectIssues.length === 0) {
    return null;
  }

  return {
    id: 'recertify-project-timestamp',
    kind: 'project-evidence',
    projectId: project.projectId,
    priority: 'high',
    requiredAction: 'repair-project-timestamp-before-reputation-update',
    reasons: projectIssues
  };
}

function buildTimelinePacket(project, reviewDecisions, commentDecisions, projectIssues) {
  const generatedAt = hasValidTime(project.asOf) ? project.asOf : null;
  const projectEvents = projectIssues.map((reason) => ({
    type: 'project-recertification-required',
    projectId: project.projectId,
    status: 'recertification-required',
    reasons: [reason]
  }));

  const reviewEvents = reviewDecisions.map((decision) => ({
    type: decision.status === 'current' ? 'review-evidence-current' : 'review-recertification-required',
    reviewId: decision.id,
    artifactId: decision.artifactId,
    reviewer: decision.reviewer,
    status: decision.status,
    reasons: decision.reasons
  }));

  const commentEvents = commentDecisions
    .filter((decision) => decision.status !== 'current')
    .map((decision) => ({
      type: 'inline-comment-recertification-required',
      commentId: decision.id,
      artifactId: decision.artifactId,
      reviewer: decision.reviewer,
      status: decision.status,
      reasons: decision.reasons
    }));

  const events = [...projectEvents, ...reviewEvents, ...commentEvents];

  return {
    projectId: project.projectId,
    generatedAt,
    events,
    auditDigest: digest({
      projectId: project.projectId,
      generatedAt,
      events
    })
  };
}

function evaluateRecertification(project) {
  const normalizedProject = normalizeProject(project);
  const projectIssues = isRecord(project) && !hasValidTime(normalizedProject.asOf)
    ? ['invalid-project-timestamp']
    : [];
  const reviews = normalizeReviewEntries(normalizedProject.reviews);
  const inlineComments = normalizeInlineCommentEntries(normalizedProject.inlineComments);
  const reviewDecisions = reviews.map((review) => evaluateReview(normalizedProject, review));
  const reputationActions = reviews.map((review, index) =>
    reputationActionForReview(review, reviewDecisions[index])
  );
  const commentDecisions = inlineComments.map((comment) => evaluateComment(normalizedProject, comment));
  const recertificationTasks = [
    taskForProjectTimestamp(normalizedProject, projectIssues),
    ...reviews.map((review, index) => taskForReview(review, reviewDecisions[index])),
    ...inlineComments.map((comment, index) => taskForComment(comment, commentDecisions[index]))
  ].filter(Boolean);
  const staleReviews = reviewDecisions.filter((decision) => decision.status !== 'current').length;
  const staleComments = commentDecisions.filter((decision) => decision.status !== 'current').length;
  const timelinePacket = buildTimelinePacket(
    normalizedProject,
    reviewDecisions,
    commentDecisions,
    projectIssues
  );

  return {
    projectId: normalizedProject.projectId,
    generatedAt: normalizedProject.asOf,
    reviewDecisions,
    commentDecisions,
    reputationActions,
    recertificationTasks,
    timelinePacket,
    summary: {
      totalReviews: reviewDecisions.length,
      staleReviews,
      staleComments,
      staleProjectEvidence: projectIssues.length,
      frozenReputationDelta: reputationActions
        .filter((action) => action.action === 'freeze-until-recertified')
        .reduce((sum, action) => sum + action.originalDelta, 0),
      recommendedAction: (projectIssues.length > 0 || staleReviews > 0 || staleComments > 0)
        ? 'block-reputation-update'
        : 'allow-reputation-update'
    }
  };
}

function buildSampleProject() {
  return {
    projectId: 'project-alpha-replication',
    asOf: '2026-05-28T06:00:00Z',
    artifacts: [
      {
        id: 'dataset-cohort-table',
        type: 'dataset',
        currentDigest: 'sha256:dataset-v2',
        changedAt: '2026-05-24T12:00:00Z',
        currentAnchors: {}
      },
      {
        id: 'notebook-methods',
        type: 'notebook',
        currentDigest: 'sha256:notebook-v1',
        changedAt: '2026-05-10T10:00:00Z',
        currentAnchors: {}
      },
      {
        id: 'analysis-code',
        type: 'code',
        currentDigest: 'sha256:code-v3',
        changedAt: '2026-05-19T09:30:00Z',
        currentAnchors: {
          'src/analyze.py#L41': { line: 47 }
        }
      }
    ],
    reviews: [
      {
        id: 'review-dataset-methods',
        reviewerId: 'orcid:0000-0002-reviewer-a',
        mode: 'public',
        artifactId: 'dataset-cohort-table',
        evidenceDigest: 'sha256:dataset-v1',
        submittedAt: '2026-05-18T09:00:00Z',
        reputationDelta: 18
      },
      {
        id: 'review-notebook-methods',
        reviewerId: 'orcid:0000-0002-reviewer-b',
        mode: 'semi-private',
        artifactId: 'notebook-methods',
        evidenceDigest: 'sha256:notebook-v1',
        submittedAt: '2026-05-12T10:00:00Z',
        reputationDelta: 9
      },
      {
        id: 'review-missing-public-reviewer',
        mode: 'public',
        artifactId: 'notebook-methods',
        evidenceDigest: 'sha256:notebook-v1',
        submittedAt: '2026-05-12T10:30:00Z',
        reputationDelta: 12
      },
      {
        id: 'review-code-recertified',
        reviewerId: 'orcid:0000-0002-reviewer-c',
        mode: 'public',
        artifactId: 'analysis-code',
        evidenceDigest: 'sha256:code-v3',
        submittedAt: '2026-05-16T11:00:00Z',
        recertifiedAt: '2026-05-21T13:00:00Z',
        reputationDelta: 14
      },
      {
        id: 'review-blind-data',
        reviewerId: 'orcid:0000-0002-private',
        anonymousLabel: 'anonymous-reviewer-7',
        mode: 'double-blind',
        artifactId: 'dataset-cohort-table',
        evidenceDigest: 'sha256:dataset-v1',
        submittedAt: '2026-05-17T10:30:00Z',
        reputationDelta: 11
      }
    ],
    inlineComments: [
      {
        id: 'comment-code-line-41',
        reviewerId: 'orcid:0000-0002-reviewer-b',
        mode: 'public',
        artifactId: 'analysis-code',
        anchorDigest: 'sha256:code-v2',
        anchor: {
          selector: 'src/analyze.py#L41',
          line: 41
        },
        submittedAt: '2026-05-18T14:30:00Z'
      }
    ]
  };
}

module.exports = {
  evaluateRecertification,
  buildSampleProject,
  digest
};
