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

function redactText(value) {
  return String(value || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/token=[^\s]+/gi, 'token=[redacted]');
}

function reviewSubscriber(workspace, subscriber) {
  const holds = [];
  const retryPolicy = subscriber.retryPolicy || {};

  if (subscriber.active !== true) {
    holds.push('subscriber-inactive');
  }

  if (!String(subscriber.ownerId || '').trim()) {
    holds.push('missing-owner');
  }

  if (!String(subscriber.idempotencyKey || '').trim()) {
    holds.push('missing-idempotency-key');
  }

  if (retryPolicy.strategy !== 'exponential') {
    holds.push('retry-strategy-not-exponential');
  }

  if (Number(retryPolicy.maxAttempts || 0) > Number(workspace.maxRetryAttempts || 0)) {
    holds.push('retry-budget-exceeds-policy');
  }

  if (!String(subscriber.deadLetterQueue || '').trim()) {
    holds.push('missing-dead-letter-route');
  }

  if (Number(subscriber.recentSuccesses || 0) < Number(workspace.minRecentSuccesses || 0)) {
    holds.push('recent-success-window-insufficient');
  }

  if (Number(subscriber.lastFailureMinutesAgo || 0) > Number(workspace.maxFailureAgeMinutes || 0)) {
    holds.push('failure-age-exceeds-window');
  }

  const decision = holds.length === 0 ? 'ready' : 'hold';

  return {
    subscriberId: subscriber.id,
    decision,
    holds,
    metrics: {
      recentSuccesses: Number(subscriber.recentSuccesses || 0),
      lastFailureMinutesAgo: Number(subscriber.lastFailureMinutesAgo || 0),
      retryStrategy: retryPolicy.strategy || 'missing',
      maxAttempts: Number(retryPolicy.maxAttempts || 0),
      hasDeadLetterQueue: Boolean(subscriber.deadLetterQueue)
    },
    actions: {
      markIntegrationHealthy: decision === 'ready',
      routeToDeadLetterReview: holds.includes('missing-dead-letter-route') || holds.includes('failure-age-exceeds-window'),
      requestOwnerAck: holds.includes('missing-owner'),
      suppressEnterpriseReadyBadge: decision !== 'ready'
    }
  };
}

function reviewWebhookDeliveryReadiness(workspace) {
  const subscriberReviews = (workspace.subscribers || []).map((subscriber) =>
    reviewSubscriber(workspace, subscriber)
  );
  const readyCount = subscriberReviews.filter((review) => review.decision === 'ready').length;
  const holdCount = subscriberReviews.length - readyCount;
  const review = {
    workspaceId: workspace.id,
    title: workspace.title,
    readyCount,
    holdCount,
    subscriberReviews
  };

  return {
    ...review,
    digest: digest(review)
  };
}

function buildDeliveryPacket(workspace, review) {
  return {
    workspaceId: workspace.id,
    title: workspace.title,
    summary: {
      ready: review.readyCount,
      hold: review.holdCount
    },
    subscribers: review.subscriberReviews.map((subscriberReview) => {
      const subscriber = (workspace.subscribers || []).find(
        (candidate) => candidate.id === subscriberReview.subscriberId
      );

      return {
        subscriberId: subscriberReview.subscriberId,
        decision: subscriberReview.decision,
        holds: subscriberReview.holds,
        metrics: subscriberReview.metrics,
        actions: subscriberReview.actions,
        redactedFailurePayload: redactText(subscriber && subscriber.failurePayload)
      };
    }),
    digest: review.digest
  };
}

module.exports = {
  buildDeliveryPacket,
  reviewWebhookDeliveryReadiness
};
