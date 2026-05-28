const crypto = require('crypto');

const BLOCKED_UPDATES = [
  'reviewer-reputation',
  'trusted-reviewer-badge',
  'leaderboards',
  'project-timeline'
];

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

function isBlindReview(mode) {
  return ['anonymous', 'blind', 'double-blind', 'fully-anonymous'].includes(mode);
}

function reviewerLabel(review) {
  if (isBlindReview(review.mode)) {
    return review.anonymousLabel || 'anonymous-reviewer';
  }

  return `reviewer:${review.reviewerId}`;
}

function unique(values) {
  return [...new Set(values)];
}

function pressureText(citation) {
  return `${citation.requestText || ''} ${citation.condition || ''}`.toLowerCase();
}

function hasReciprocalPressure(citation) {
  const text = pressureText(citation);
  return Boolean(
    citation.reciprocalPromise ||
      text.includes('cite mine and i will cite yours') ||
      text.includes('reciprocal citation') ||
      text.includes('mutual citation') ||
      text.includes('citation exchange')
  );
}

function hasQuotaPressure(citation) {
  const text = pressureText(citation);
  return Boolean(
    citation.journalQuota ||
      citation.editorialQuota ||
      text.includes('journal impact factor') ||
      text.includes('citation quota') ||
      text.includes('minimum journal citations') ||
      text.includes('cite at least')
  );
}

function isCoerciveRequirement(citation) {
  const text = pressureText(citation);
  return Boolean(
    citation.requiredForAcceptance ||
      text.includes('must cite') ||
      text.includes('required for acceptance') ||
      text.includes('before i can recommend acceptance') ||
      text.includes('mandatory')
  );
}

function evaluateCitation(review, citation) {
  const flags = [];
  const reasons = [];
  const relevanceScore = citation.relevanceScore ?? 0;

  if (citation.requestedByReviewerAuthor && relevanceScore < 0.5 && isCoerciveRequirement(citation)) {
    flags.push('unsupported-self-citation-demand');
    reasons.push('reviewer-authored citation is mandatory but weakly related to the manuscript');
  }

  if (hasReciprocalPressure(citation)) {
    flags.push('reciprocal-citation-pressure');
    reasons.push('citation request offers or implies reciprocal citation benefit');
  }

  if (hasQuotaPressure(citation)) {
    flags.push('journal-citation-quota-pressure');
    reasons.push('citation request appears tied to journal or editor citation quota pressure');
  }

  return {
    citationId: citation.id,
    title: citation.title,
    relevanceScore,
    requestedByReviewerAuthor: Boolean(citation.requestedByReviewerAuthor),
    requestedByEditorOrVenue: Boolean(citation.requestedByEditorOrVenue || citation.journalQuota),
    requiredForAcceptance: Boolean(isCoerciveRequirement(citation)),
    flags: unique(flags),
    reasons,
    reviewMode: review.mode
  };
}

function findReviewFlags(review, citationFindings) {
  const flags = citationFindings.flatMap((finding) => finding.flags);
  const lowRelevanceRequired = review.requestedCitations.filter(
    (citation) => (citation.relevanceScore ?? 0) < 0.35 && isCoerciveRequirement(citation)
  );

  if (lowRelevanceRequired.length >= 2) {
    flags.push('off-topic-citation-cluster');
  }

  return unique(flags);
}

function highestSeverity(flags) {
  if (
    flags.includes('unsupported-self-citation-demand') ||
    flags.includes('reciprocal-citation-pressure') ||
    flags.includes('journal-citation-quota-pressure')
  ) {
    return 'high';
  }

  if (flags.length > 0) {
    return 'medium';
  }

  return 'none';
}

function evaluateReview(review) {
  const citationFindings = review.requestedCitations.map((citation) => evaluateCitation(review, citation));
  const flags = findReviewFlags(review, citationFindings);
  const flagged = flags.length > 0;

  return {
    id: review.id,
    projectId: review.projectId,
    reviewer: reviewerLabel(review),
    mode: review.mode,
    submittedAt: review.submittedAt,
    decision: flagged ? 'steward-review-required' : 'allow-reputation-update',
    highestSeverity: highestSeverity(flags),
    flags,
    citationFindings,
    requiredStewardAction: flagged
      ? 'review-citation-demands-before-score-or-badge-update'
      : 'none'
  };
}

function buildReputationAction(review, decision) {
  if (decision.decision === 'allow-reputation-update') {
    return {
      id: `apply-${review.id}`,
      reviewId: review.id,
      reviewer: decision.reviewer,
      action: 'apply-reviewer-credit',
      originalReviewerDelta: review.reviewerDelta,
      effectiveReviewerDelta: review.reviewerDelta,
      evidenceDigest: digest({
        reviewId: review.id,
        decision: decision.decision,
        flags: decision.flags
      })
    };
  }

  return {
    id: `hold-${review.id}`,
    reviewId: review.id,
    reviewer: decision.reviewer,
    action: 'hold-reviewer-credit',
    originalReviewerDelta: review.reviewerDelta,
    effectiveReviewerDelta: 0,
    blockedUpdates: BLOCKED_UPDATES,
    evidenceDigest: digest({
      reviewId: review.id,
      decision: decision.decision,
      flags: decision.flags
    })
  };
}

function buildStewardTask(review, decision) {
  if (decision.decision === 'allow-reputation-update') {
    return null;
  }

  return {
    id: `task-${review.id}`,
    reviewId: review.id,
    projectId: review.projectId,
    reviewer: decision.reviewer,
    priority: decision.highestSeverity === 'high' ? 'high' : 'normal',
    requiredAction: 'remove-or-justify-coercive-citation-requests',
    blockedUpdates: BLOCKED_UPDATES,
    flags: decision.flags,
    citationIds: decision.citationFindings
      .filter((finding) => finding.flags.length > 0 || finding.requiredForAcceptance)
      .map((finding) => finding.citationId)
  };
}

function buildAuthorProtections(reviewDecisions) {
  const protectedProjects = new Map();

  for (const decision of reviewDecisions) {
    if (decision.decision !== 'steward-review-required') {
      continue;
    }

    if (!protectedProjects.has(decision.projectId)) {
      protectedProjects.set(decision.projectId, {
        id: `protect-${decision.projectId}`,
        projectId: decision.projectId,
        action: 'block-author-penalty',
        reasons: ['citation-pressure-under-review'],
        blockedUpdates: [
          'author-response-penalty',
          'project-quality-badge-decay',
          'timeline-negative-review-event'
        ],
        relatedReviewIds: []
      });
    }

    protectedProjects.get(decision.projectId).relatedReviewIds.push(decision.id);
  }

  return [...protectedProjects.values()];
}

function buildAuditPacket(packet, reviewDecisions, reputationActions, stewardTasks, authorProtections) {
  const events = [
    ...reviewDecisions.map((decision) => ({
      type: decision.decision === 'allow-reputation-update' ? 'citation-review-allowed' : 'citation-pressure-held',
      reviewId: decision.id,
      projectId: decision.projectId,
      reviewer: decision.reviewer,
      flags: decision.flags,
      decision: decision.decision
    })),
    ...stewardTasks.map((task) => ({
      type: 'steward-task-created',
      taskId: task.id,
      reviewId: task.reviewId,
      projectId: task.projectId,
      priority: task.priority
    })),
    ...authorProtections.map((protection) => ({
      type: 'author-protection-applied',
      projectId: protection.projectId,
      relatedReviewIds: protection.relatedReviewIds
    }))
  ];

  const auditDigest = digest({
    packetId: packet.packetId,
    generatedAt: packet.asOf,
    events
  });

  return {
    packetId: packet.packetId,
    generatedAt: packet.asOf,
    events,
    auditDigest
  };
}

function evaluateCitationCoercion(packet) {
  const reviewDecisions = packet.reviews.map(evaluateReview);
  const reputationActions = packet.reviews.map((review, index) =>
    buildReputationAction(review, reviewDecisions[index])
  );
  const stewardTasks = packet.reviews
    .map((review, index) => buildStewardTask(review, reviewDecisions[index]))
    .filter(Boolean);
  const authorProtections = buildAuthorProtections(reviewDecisions);
  const auditPacket = buildAuditPacket(packet, reviewDecisions, reputationActions, stewardTasks, authorProtections);
  const heldReviewerCredit = reputationActions
    .filter((action) => action.action === 'hold-reviewer-credit')
    .reduce((total, action) => total + action.originalReviewerDelta, 0);

  return {
    packetId: packet.packetId,
    generatedAt: packet.asOf,
    reviewDecisions,
    reputationActions,
    stewardTasks,
    authorProtections,
    auditPacket,
    summary: {
      totalReviews: reviewDecisions.length,
      flaggedReviews: reviewDecisions.filter((decision) => decision.decision === 'steward-review-required').length,
      heldReviewerCredit,
      protectedProjects: authorProtections.length,
      recommendedAction:
        stewardTasks.length > 0
          ? 'pause-coerced-citation-reputation-updates'
          : 'allow-citation-related-reputation-updates'
    }
  };
}

function buildSampleReviewPacket() {
  return {
    packetId: 'citation-coercion-review-batch-2026-05-28',
    asOf: '2026-05-28T12:30:00Z',
    reviews: [
      {
        id: 'review-r1-self-citation',
        projectId: 'project-neuro-open',
        reviewerId: 'orcid:0000-0001-reviewer-alpha',
        mode: 'public',
        submittedAt: '2026-05-28T09:00:00Z',
        reviewerDelta: 10,
        requestedCitations: [
          {
            id: 'cite-alpha-2024',
            title: 'Alpha Lab Editorial Notes On Cognitive Maps',
            relevanceScore: 0.22,
            requestedByReviewerAuthor: true,
            requiredForAcceptance: true,
            requestText: 'You must cite this before I can recommend acceptance.'
          },
          {
            id: 'cite-alpha-2023',
            title: 'Unrelated Rodent Navigation Commentary',
            relevanceScore: 0.18,
            requestedByReviewerAuthor: true,
            requiredForAcceptance: true,
            requestText: 'This reviewer-authored citation is mandatory.'
          },
          {
            id: 'cite-domain-2019',
            title: 'Domain Background Review',
            relevanceScore: 0.71,
            requestedByReviewerAuthor: false,
            requiredForAcceptance: false,
            requestText: 'Consider as optional context.'
          }
        ]
      },
      {
        id: 'review-r2-reciprocal-pressure',
        projectId: 'project-neuro-open',
        reviewerId: 'orcid:0000-0002-private-pressure',
        anonymousLabel: 'anonymous-reviewer-42',
        mode: 'double-blind',
        submittedAt: '2026-05-28T09:30:00Z',
        reviewerDelta: 7,
        requestedCitations: [
          {
            id: 'cite-mutual-2025',
            title: 'Mutual Citation Network Preprint',
            relevanceScore: 0.55,
            requestedByReviewerAuthor: true,
            reciprocalPromise: true,
            requiredForAcceptance: true,
            requestText: 'Cite mine and I will cite yours in our next review.'
          }
        ]
      },
      {
        id: 'review-r3-quota-pressure',
        projectId: 'project-protein-open',
        reviewerId: 'orcid:0000-0003-editorial-pressure',
        mode: 'semi-private',
        submittedAt: '2026-05-28T10:00:00Z',
        reviewerDelta: 6,
        requestedCitations: [
          {
            id: 'cite-journal-quota-2026',
            title: 'Recent Articles From The Target Journal',
            relevanceScore: 0.42,
            requestedByEditorOrVenue: true,
            journalQuota: true,
            requiredForAcceptance: true,
            requestText: 'Cite at least three recent papers from this journal to satisfy the journal impact factor target.'
          }
        ]
      },
      {
        id: 'review-r4-legitimate-context',
        projectId: 'project-microbiome-open',
        reviewerId: 'orcid:0000-0004-methods-reviewer',
        mode: 'public',
        submittedAt: '2026-05-28T10:30:00Z',
        reviewerDelta: 8,
        requestedCitations: [
          {
            id: 'cite-methods-2021',
            title: 'Benchmark Dataset Normalization Methods',
            relevanceScore: 0.91,
            requestedByReviewerAuthor: false,
            requiredForAcceptance: false,
            requestText: 'This optional context may help readers compare normalization methods.'
          }
        ]
      }
    ]
  };
}

module.exports = {
  evaluateCitationCoercion,
  buildSampleReviewPacket,
  digest
};
