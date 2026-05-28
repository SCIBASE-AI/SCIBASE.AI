const crypto = require('crypto');

const MIXED_POLARITIES = new Set(['negative', 'null', 'inconclusive', 'failed-replication']);

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

function redactText(value) {
  return String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/token=[^\s]+/gi, 'token=[redacted]');
}

function evidencePolarityCounts(evidence) {
  return (evidence || []).reduce((counts, item) => {
    const polarity = item.polarity || 'unknown';
    counts[polarity] = (counts[polarity] || 0) + 1;
    return counts;
  }, {});
}

function reviewEdge(edge) {
  const holds = [];
  const mixedEvidence = (edge.evidence || []).filter((item) => MIXED_POLARITIES.has(item.polarity));
  const failedReplication = (edge.evidence || []).some(
    (item) => item.polarity === 'failed-replication'
  );
  const nullEvidence = (edge.evidence || []).filter((item) => item.polarity === 'null');

  if (edge.recommendationCandidate && mixedEvidence.length > 0 && !edge.surfacesNegativeEvidence) {
    holds.push('negative-evidence-hidden');
  }

  if (failedReplication) {
    holds.push('failed-replication-present');
  }

  for (const item of nullEvidence) {
    if (!item.doi) {
      holds.push('null-result-missing-citation');
      break;
    }
  }

  for (const item of nullEvidence) {
    if (!item.context) {
      holds.push('null-result-missing-context');
      break;
    }
  }

  const decision = holds.length === 0 ? 'ready' : 'hold';

  return {
    edgeId: edge.id,
    source: edge.source,
    relation: edge.relation,
    target: edge.target,
    decision,
    holds,
    metrics: {
      evidenceCount: (edge.evidence || []).length,
      polarityCounts: evidencePolarityCounts(edge.evidence),
      recommendationCandidate: Boolean(edge.recommendationCandidate)
    },
    actions: {
      surfaceRecommendation: decision === 'ready' && Boolean(edge.recommendationCandidate),
      attachNullResultSummary: mixedEvidence.length > 0,
      requireCuratorReview: holds.length > 0
    }
  };
}

function reviewKnowledgeGap(intersection) {
  const underexplored = intersection.citationCount < 5 && (intersection.unresolvedQuestions || []).length > 0;
  const decision = underexplored && !intersection.surfacedAsGap ? 'surface-gap' : 'tracked';
  const actions = [];

  if (decision === 'surface-gap') {
    actions.push('surface-underexplored-intersection');
    actions.push('attach-unresolved-question-summary');
  }

  return {
    intersectionId: intersection.id,
    concepts: intersection.concepts || [],
    decision,
    citationCount: intersection.citationCount,
    unresolvedQuestionCount: (intersection.unresolvedQuestions || []).length,
    actions
  };
}

function reviewKnowledgeGraphSignals(graph) {
  const edgeReviews = (graph.edges || []).map(reviewEdge);
  const knowledgeGapReviews = (graph.intersections || []).map(reviewKnowledgeGap);
  const readyCount = edgeReviews.filter((edge) => edge.decision === 'ready').length;
  const holdCount = edgeReviews.length - readyCount;
  const knowledgeGapCount = knowledgeGapReviews.filter(
    (gap) => gap.decision === 'surface-gap'
  ).length;
  const review = {
    graphId: graph.id,
    title: graph.title,
    reviewDate: graph.reviewDate,
    edgeCount: edgeReviews.length,
    readyCount,
    holdCount,
    knowledgeGapCount,
    edgeReviews,
    knowledgeGapReviews
  };

  return {
    ...review,
    digest: digest(review)
  };
}

function buildDiscoveryPacket(graph, review) {
  return {
    graphId: graph.id,
    title: graph.title,
    reviewDate: graph.reviewDate,
    summary: {
      ready: review.readyCount,
      hold: review.holdCount,
      gaps: review.knowledgeGapCount
    },
    edges: review.edgeReviews.map((edgeReview) => {
      const edge = (graph.edges || []).find((candidate) => candidate.id === edgeReview.edgeId);
      return {
        ...edgeReview,
        redactedAuditLog: redactText(edge && edge.auditLog)
      };
    }),
    knowledgeGaps: review.knowledgeGapReviews,
    digest: review.digest
  };
}

module.exports = {
  buildDiscoveryPacket,
  reviewKnowledgeGraphSignals
};
