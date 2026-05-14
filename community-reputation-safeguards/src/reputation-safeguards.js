'use strict';

const CREDIT_ROLES = [
  'conceptualization',
  'data-curation',
  'formal-analysis',
  'funding-acquisition',
  'investigation',
  'methodology',
  'project-administration',
  'software',
  'supervision',
  'validation',
  'visualization',
  'writing-original-draft',
  'writing-review-editing',
];

const MODE_VISIBILITY = {
  public: 'reviewer-visible',
  'semi-private': 'reviewer-visible-to-authors',
  anonymous: 'reviewer-hidden',
  'double-blind': 'reviewer-and-author-hidden',
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function userById(community) {
  return new Map(asArray(community.users).map((user) => [user.id, user]));
}

function displayName(user) {
  return user ? user.name : 'Unknown contributor';
}

function reviewerAlias(review) {
  return `anonymous-reviewer-${String(review.id || '').replace(/[^a-z0-9]/gi, '').slice(-4) || '0000'}`;
}

function redactReview(review, users) {
  const mode = review.mode || 'public';
  const reviewer = users.get(review.reviewerId);
  const authorVisible = mode !== 'double-blind';
  const reviewerVisible = mode === 'public' || mode === 'semi-private';

  return {
    id: review.id,
    projectId: review.projectId,
    mode,
    visibility: MODE_VISIBILITY[mode] || MODE_VISIBILITY.public,
    reviewer: reviewerVisible ? {
      id: review.reviewerId,
      name: displayName(reviewer),
      institution: reviewer && reviewer.institution,
    } : {
      id: reviewerAlias(review),
      name: 'Anonymous reviewer',
    },
    authorsVisible: authorVisible,
    scores: review.scores || {},
    summary: review.summary,
    createdAt: review.createdAt,
    conflictOfInterest: Boolean(review.conflictOfInterest),
  };
}

function redactComment(comment, review) {
  const mode = review ? review.mode : 'public';
  const hidden = mode === 'anonymous' || mode === 'double-blind';

  return {
    id: comment.id,
    reviewId: comment.reviewId,
    artifact: {
      type: comment.artifactType,
      id: comment.artifactId,
      path: comment.path,
      lineRange: comment.lineRange || null,
    },
    body: comment.body,
    author: hidden ? {
      id: reviewerAlias(review || comment),
      name: 'Anonymous reviewer',
    } : {
      id: comment.authorId,
    },
    createdAt: comment.createdAt,
  };
}

function reviewQuality(review) {
  const scores = Object.values(review.scores || {}).map(Number).filter(Number.isFinite);
  const scoreAverage = scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : 0;
  const textDepth = Math.min(1, String(review.summary || '').split(/\s+/).filter(Boolean).length / 35);
  const hasTemplateScores = scores.length >= 4 ? 1 : 0;
  return round(clamp(scoreAverage * 12 + textDepth * 25 + hasTemplateScores * 15, 0, 100));
}

function buildContributionGraph(community) {
  const users = userById(community);
  const nodes = new Map();
  const edges = [];

  asArray(community.contributions).forEach((contribution) => {
    const user = users.get(contribution.userId);
    if (!nodes.has(contribution.userId)) {
      nodes.set(contribution.userId, {
        id: contribution.userId,
        name: displayName(user),
        roles: [],
        projects: [],
        contributionCount: 0,
      });
    }

    const node = nodes.get(contribution.userId);
    node.roles.push(...asArray(contribution.roles).filter((role) => CREDIT_ROLES.includes(role)));
    node.projects.push(contribution.projectId);
    node.contributionCount += 1;
    edges.push({
      from: contribution.userId,
      to: contribution.projectId,
      roles: asArray(contribution.roles),
      at: contribution.createdAt,
      artifactId: contribution.artifactId,
    });
  });

  return {
    nodes: [...nodes.values()].map((node) => ({
      ...node,
      roles: unique(node.roles),
      projects: unique(node.projects),
    })),
    edges,
  };
}

function detectAbuseSignals(community) {
  const signals = [];
  const endorsements = asArray(community.endorsements);
  const reviews = asArray(community.reviews);

  endorsements.forEach((endorsement) => {
    if (endorsement.fromUserId === endorsement.toUserId) {
      signals.push({
        type: 'self-endorsement',
        severity: 'high',
        userId: endorsement.toUserId,
        message: 'Contributor endorsed themself.',
      });
    }
  });

  endorsements.forEach((endorsement) => {
    const reciprocal = endorsements.find((candidate) => {
      return candidate.fromUserId === endorsement.toUserId &&
        candidate.toUserId === endorsement.fromUserId &&
        candidate.fromUserId !== candidate.toUserId;
    });
    if (reciprocal && endorsement.fromUserId < endorsement.toUserId) {
      signals.push({
        type: 'reciprocal-endorsement-loop',
        severity: 'medium',
        userId: endorsement.fromUserId,
        peerUserId: endorsement.toUserId,
        message: 'Pair of contributors endorsed each other and should be trust-weighted lower.',
      });
    }
  });

  reviews.forEach((review) => {
    if (review.conflictOfInterest) {
      signals.push({
        type: 'review-conflict',
        severity: 'high',
        userId: review.reviewerId,
        reviewId: review.id,
        message: 'Review has a declared conflict of interest.',
      });
    }

    if (reviewQuality(review) < 45) {
      signals.push({
        type: 'low-evidence-review',
        severity: 'medium',
        userId: review.reviewerId,
        reviewId: review.id,
        message: 'Review is too shallow to carry full reputation weight.',
      });
    }
  });

  return signals;
}

function endorsementScore(userId, community, abuseSignals) {
  const incoming = asArray(community.endorsements).filter((endorsement) => endorsement.toUserId === userId);
  return incoming.reduce((total, endorsement) => {
    const self = endorsement.fromUserId === endorsement.toUserId;
    const loop = abuseSignals.some((signal) => {
      return signal.type === 'reciprocal-endorsement-loop' &&
        (signal.userId === endorsement.fromUserId || signal.peerUserId === endorsement.fromUserId);
    });
    const trustWeight = self ? 0 : loop ? 0.35 : 1;
    return total + Number(endorsement.weight || 1) * trustWeight * 8;
  }, 0);
}

function contributionScore(userId, community) {
  const contributions = asArray(community.contributions).filter((contribution) => contribution.userId === userId);
  const roleDiversity = unique(contributions.flatMap((contribution) => contribution.roles || [])).length;
  const artifactDiversity = unique(contributions.map((contribution) => contribution.artifactType)).length;
  return contributions.length * 4 + roleDiversity * 3 + artifactDiversity * 2;
}

function reviewScore(userId, community, abuseSignals) {
  const reviews = asArray(community.reviews).filter((review) => review.reviewerId === userId);
  return reviews.reduce((total, review) => {
    const quality = reviewQuality(review);
    const conflicted = abuseSignals.some((signal) => signal.type === 'review-conflict' && signal.reviewId === review.id);
    return total + (conflicted ? quality * 0.15 : quality) * 0.35;
  }, 0);
}

function metricScore(userId, community) {
  const metrics = (community.metrics && community.metrics[userId]) || {};
  return Number(metrics.citations || 0) * 0.35 +
    Number(metrics.forks || 0) * 0.5 +
    Number(metrics.reproducibilityBadges || 0) * 12 +
    Number(metrics.bountyCompletions || 0) * 10 +
    Number(metrics.challengeWins || 0) * 8;
}

function penaltyScore(userId, abuseSignals) {
  return abuseSignals
    .filter((signal) => signal.userId === userId || signal.peerUserId === userId)
    .reduce((total, signal) => total + (signal.severity === 'high' ? 18 : 8), 0);
}

function assignBadges(userId, community, score, abuseSignals) {
  const reviews = asArray(community.reviews).filter((review) => review.reviewerId === userId);
  const contributions = asArray(community.contributions).filter((contribution) => contribution.userId === userId);
  const metrics = (community.metrics && community.metrics[userId]) || {};
  const badges = [];

  if (reviews.length >= 2 && reviews.every((review) => reviewQuality(review) >= 70)) {
    badges.push('Trusted Reviewer');
  }
  if (Number(metrics.reproducibilityBadges || 0) > 0 && contributions.some((contribution) => {
    const roles = asArray(contribution.roles);
    return roles.includes('data-curation') || roles.includes('validation');
  })) {
    badges.push('Open Science Champion');
  }
  if (unique(contributions.flatMap((contribution) => contribution.roles || [])).length >= 4) {
    badges.push('Collaboration Builder');
  }
  if (score >= 80) {
    badges.push('Domain Leader');
  }
  if (abuseSignals.some((signal) => signal.userId === userId && signal.severity === 'high')) {
    badges.push('Reputation Watch');
  }

  return badges;
}

function tierFor(score, badges) {
  if (badges.includes('Reputation Watch')) {
    return 'needs-review';
  }
  if (score >= 85) {
    return 'trusted-reviewer';
  }
  if (score >= 65) {
    return 'established-contributor';
  }
  return 'emerging-contributor';
}

function computeReputation(community, abuseSignals) {
  return asArray(community.users).map((user) => {
    const rawScore = endorsementScore(user.id, community, abuseSignals) +
      contributionScore(user.id, community) +
      reviewScore(user.id, community, abuseSignals) +
      metricScore(user.id, community);
    const score = round(clamp(rawScore - penaltyScore(user.id, abuseSignals)));
    const badges = assignBadges(user.id, community, score, abuseSignals);

    return {
      userId: user.id,
      name: user.name,
      domain: user.domain,
      region: user.region,
      institution: user.institution,
      score,
      tier: tierFor(score, badges),
      badges,
      components: {
        endorsements: round(endorsementScore(user.id, community, abuseSignals)),
        contributions: round(contributionScore(user.id, community)),
        reviews: round(reviewScore(user.id, community, abuseSignals)),
        metrics: round(metricScore(user.id, community)),
        penalties: round(penaltyScore(user.id, abuseSignals)),
      },
    };
  }).sort((a, b) => b.score - a.score);
}

function buildLeaderboards(reputation) {
  const sorted = reputation.slice().sort((a, b) => b.score - a.score);
  const byDomain = {};
  const byRegion = {};
  const byInstitution = {};

  sorted.forEach((entry) => {
    byDomain[entry.domain] = byDomain[entry.domain] || [];
    byRegion[entry.region] = byRegion[entry.region] || [];
    byInstitution[entry.institution] = byInstitution[entry.institution] || [];
    byDomain[entry.domain].push(entry);
    byRegion[entry.region].push(entry);
    byInstitution[entry.institution].push(entry);
  });

  return {
    global: sorted,
    byDomain,
    byRegion,
    byInstitution,
  };
}

function buildTimeline(community) {
  const events = [
    ...asArray(community.reviews).map((review) => ({
      type: 'review',
      at: review.createdAt,
      actorId: review.reviewerId,
      projectId: review.projectId,
      id: review.id,
    })),
    ...asArray(community.contributions).map((contribution) => ({
      type: 'contribution',
      at: contribution.createdAt,
      actorId: contribution.userId,
      projectId: contribution.projectId,
      id: contribution.id,
    })),
    ...asArray(community.comments).map((comment) => ({
      type: 'inline-comment',
      at: comment.createdAt,
      actorId: comment.authorId,
      projectId: comment.projectId,
      id: comment.id,
    })),
  ];

  return events.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

function buildCommunityReputationReport(community) {
  if (!community || typeof community !== 'object') {
    throw new TypeError('community must be an object');
  }

  const users = userById(community);
  const reviewsById = new Map(asArray(community.reviews).map((review) => [review.id, review]));
  const abuseSignals = detectAbuseSignals(community);
  const reputation = computeReputation(community, abuseSignals);

  return {
    reviews: asArray(community.reviews).map((review) => redactReview(review, users)),
    comments: asArray(community.comments).map((comment) => redactComment(comment, reviewsById.get(comment.reviewId))),
    contributionGraph: buildContributionGraph(community),
    reputation,
    leaderboards: buildLeaderboards(reputation),
    abuseSignals,
    timeline: buildTimeline(community),
  };
}

function renderSummary(report) {
  const top = report.leaderboards.global[0];
  const signalSummary = report.abuseSignals
    .map((signal) => `- ${signal.type}: ${signal.message}`)
    .join('\n') || '- No abuse signals detected.';

  return [
    '# Community Reputation Safeguards',
    '',
    `Top contributor: ${top.name}`,
    `Top score: ${top.score}`,
    `Top badge: ${top.badges[0] || 'No badge'}`,
    `Abuse signals: ${report.abuseSignals.length}`,
    '',
    '## Safeguard Signals',
    signalSummary,
  ].join('\n');
}

module.exports = {
  buildCommunityReputationReport,
  buildContributionGraph,
  detectAbuseSignals,
  computeReputation,
  redactReview,
  redactComment,
  renderSummary,
  reviewQuality,
};
